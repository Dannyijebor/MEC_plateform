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
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      conversation_members: convMembers,
      display_name:
        conv.type === "direct"
          ? otherProfile?.full_name || otherProfile?.username || "Unknown member"
          : conv.name || "Group chat",
      display_avatar: conv.type === "direct" ? otherProfile?.avatar_url : null,
      is_direct: conv.type === "direct",
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
      created_at
    `)
    .eq("conversation_id", conversationId)
    .gt("expires_at", new Date().toISOString())
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
  status, // "missed" | "declined" | "answered"
  mode,   // "audio" | "video"
  durationSeconds = 0,
}) {
  const payload = JSON.stringify({
    status,
    mode,
    callerName,
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
