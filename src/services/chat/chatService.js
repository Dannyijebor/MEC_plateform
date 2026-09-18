import { supabase } from "../../lib/supabase"

export async function getMyConversations(userId) {
  // Get conversation IDs this user belongs to
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations!inner (
        id,
        type,
        name,
        theme,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", userId)

  if (error) throw error

  const conversationIds = (data ?? []).map((d) => d.conversation_id)
  if (conversationIds.length === 0) return []

  // Fetch ALL members of those conversations with their profiles
  const { data: members } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      user_id,
      profiles:user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .in("conversation_id", conversationIds)

  // Group members by conversation_id
  const membersByConv = {}
  for (const m of members ?? []) {
    if (!membersByConv[m.conversation_id]) membersByConv[m.conversation_id] = []
    membersByConv[m.conversation_id].push(m)
  }

  // Fetch the last message per conversation
  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, sender_id, type")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })

  const lastByConv = {}
  for (const m of lastMessages ?? []) {
    if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m
  }

  // Build clean conversation objects with display info
  return (data ?? []).map((item) => {
    const conv = item.conversations
    const convMembers = membersByConv[conv.id] ?? []
    const other = convMembers.find((m) => m.user_id !== userId)
    const otherProfile = other?.profiles

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      theme: conv.theme || "classic",
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      conversation_members: convMembers,
      display_name:
        conv.type === "direct"
          ? otherProfile?.full_name || otherProfile?.username || "Unknown member"
          : conv.name || "Group chat",
      display_avatar: conv.type === "direct" ? otherProfile?.avatar_url : null,
      is_direct: conv.type === "direct",
      last_message_at: lastByConv[conv.id]?.created_at || conv.updated_at || conv.created_at,
      last_message_preview: (() => {
        const m = lastByConv[conv.id]
        if (!m) return null
        if (m.type === "call_event" || m.content?.startsWith("[MEC_CALL]")) {
          try {
            const info = JSON.parse(m.content.slice(10))
            if (info.status === "missed") return "📞 Missed call"
            if (info.status === "answered") return "📞 Call ended"
            if (info.status === "declined") return "📞 Declined call"
            return "📞 Call"
          } catch {
            return "📞 Call"
          }
        }
        return m.content || null
      })(),
      last_message_mine: lastByConv[conv.id]?.sender_id === userId,
    }
  })
}

export async function getConversationMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      media_url,
      media_type,
      expires_at,
      read_at,
      created_at
    `)
    .eq("conversation_id", conversationId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })

  if (error) throw error

  return data || []
}

export async function sendMessage({
  conversationId,
  senderId,
  content,
  mediaUrl = null,
  mediaType = null,
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content?.trim() || null,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select()
    .single()

  if (error) throw error

  return data
}

export function subscribeToConversation(conversationId, onMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new)
      },
    )
    .subscribe()

  // Return a proper cleanup function instead of the raw channel
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function unsubscribeFromConversation(channel) {
  if (!channel) return

  await supabase.removeChannel(channel)
}

export async function getOrCreateConversation(currentUserId, targetUserId) {
  // 1. Check if a direct conversation already exists
  const { data: existing } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(type)")
    .eq("user_id", currentUserId)
    .eq("conversations.type", "direct")

  if (existing && existing.length > 0) {
    const conversationIds = existing.map((c) => c.conversation_id)

    const { data: match } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in("conversation_id", conversationIds)
      .maybeSingle()

    if (match) return match.conversation_id
  }

  // 2. Create new conversation with client-generated UUID
  const newId = crypto.randomUUID()

  const { error: createError } = await supabase
    .from("conversations")
    .insert({
      id: newId,
      type: "direct",
      created_by: currentUserId,
    })

  if (createError) throw createError

  // 3. Add both users as members
  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: newId, user_id: currentUserId },
      { conversation_id: newId, user_id: targetUserId },
    ])

  if (memberError) throw memberError

  return newId
}

/**
 * Log a call event as a special system message in the conversation.
 * These render as call cards and auto-expire after 24 hours.
 */
export async function logCallEvent({
  conversationId,
  callerId,
  callerName,
  calleeId,
  calleeName,
  status, // "missed" | "declined" | "answered"
  mode,   // "audio" | "video"
  durationSeconds = 0,
}) {
  const payload = JSON.stringify({
    status,
    mode,
    callerId,
    callerName,
    calleeId,
    calleeName,
    duration: durationSeconds,
  })

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: callerId,
      content: `[MEC_CALL]${payload}`,
      type: "call_event",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark all messages in a conversation as read for the current user.
 * Only marks messages sent by OTHERS (not your own).
 */
export async function markConversationAsRead(conversationId, userId) {
  if (!conversationId || !userId) return

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null)

  if (error) throw error
}

/**
 * Get unread message count per conversation for a user.
 * Returns { [conversationId]: count }
 */
export async function getUnreadCounts(userId) {
  if (!userId) return {}

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, read_at")
    .neq("sender_id", userId)
    .is("read_at", null)

  if (error) throw error

  const counts = {}
  for (const row of data || []) {
    counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1
  }
  return counts
}

/**
 * Edit the content of an existing message.
 */
export async function editMessage(messageId, newContent) {
  const { data, error } = await supabase
    .from("messages")
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a message (only your own).
 */
export async function deleteMessage(messageId) {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)

  if (error) throw error
}

/**
 * Send a message with an optional reply_to_id.
 */
export async function sendReplyMessage({
  conversationId,
  senderId,
  content,
  replyToId,
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      reply_to_id: replyToId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all reactions for a set of messages.
 * Returns { [messageId]: [{ emoji, user_id, id }, ...] }
 */
export async function getReactionsForMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return {}

  const { data, error } = await supabase
    .from("message_reactions")
    .select("id, message_id, user_id, emoji")
    .in("message_id", messageIds)

  if (error) throw error

  const grouped = {}
  for (const r of data || []) {
    if (!grouped[r.message_id]) grouped[r.message_id] = []
    grouped[r.message_id].push(r)
  }
  return grouped
}

/**
 * Toggle a reaction on a message for the current user.
 * If the reaction already exists, remove it. Otherwise, add it.
 */
export async function toggleReaction({ messageId, userId, emoji }) {
  // Check if exists
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id)
    if (error) throw error
    return { action: "removed", emoji }
  }

  const { error } = await supabase
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: userId, emoji })

  if (error) throw error
  return { action: "added", emoji }
}

/**
 * Update the shared theme of a conversation.
 * Both participants will see the change instantly.
 */
export async function setConversationTheme(conversationId, themeKey) {
  if (!conversationId || !themeKey) return

  const { error } = await supabase
    .from("conversations")
    .update({ theme: themeKey, updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  if (error) throw error
}

/**
 * Log a theme change as a system message in the conversation.
 */
export async function logThemeChange({
  conversationId,
  userId,
  userName,
  themeName,
}) {
  const payload = JSON.stringify({ themeName, userName })

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: `[MEC_THEME]${payload}`,
      type: "theme_change",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}
