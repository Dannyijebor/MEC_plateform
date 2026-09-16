import { supabase } from "../../lib/supabase"

export function subscribeToSpace(spaceId, handlers = {}) {
  const {
    onParticipantChange,
    onReaction,
    onHandRaise,
    onSpaceChange,
  } = handlers

  const channel = supabase
    .channel(`space:${spaceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "space_participants",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        onParticipantChange?.(payload)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "space_reactions",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        onReaction?.(payload.new)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "space_hand_raises",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        onHandRaise?.(payload)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "spaces",
        filter: `id=eq.${spaceId}`,
      },
      (payload) => {
        onSpaceChange?.(payload)
      },
    )
    .subscribe()

  return channel
}

export async function unsubscribeFromSpace(channel) {
  if (!channel) return

  await supabase.removeChannel(channel)
}
