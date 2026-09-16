import { supabase } from "../../lib/supabase"

export async function getMyConversations(userId) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations (
        id,
        name,
        type,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", userId)

  if (error) throw error

  return (data || [])
    .map((item) => item.conversations)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) -
        new Date(a.updated_at || a.created_at),
    )
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
  return supabase
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
}

export async function unsubscribeFromConversation(channel) {
  if (!channel) return

  await supabase.removeChannel(channel)
}
