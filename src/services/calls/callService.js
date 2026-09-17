import { supabase } from "../../lib/supabase"

/**
 * Create a channel for a specific call.
 * Used by both caller and callee to exchange WebRTC signals.
 */
export function createCallChannel(callId, callbacks = {}) {
  const { onSignal, onCallState, onEnded } = callbacks

  const channel = supabase
    .channel(`call:${callId}`, {
      config: { broadcast: { self: false } },
    })
    .on("broadcast", { event: "signal" }, ({ payload }) => {
      onSignal?.(payload)
    })
    .on("broadcast", { event: "call-state" }, ({ payload }) => {
      onCallState?.(payload)
    })
    .on("broadcast", { event: "call-ended" }, ({ payload }) => {
      onEnded?.(payload)
    })
    .subscribe()

  return channel
}

/**
 * Send a WebRTC signal (offer/answer/ice) over the channel.
 */
export async function sendSignal(channel, signal) {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "signal",
    payload: signal,
  })
}

/**
 * Broadcast call state (e.g., "joined", "muted", "camera-off").
 */
export async function sendCallState(channel, state) {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "call-state",
    payload: state,
  })
}

/**
 * Broadcast that the call has ended.
 */
export async function endCall(channel, reason = "user-ended") {
  if (!channel) return
  await channel.send({
    type: "broadcast",
    event: "call-ended",
    payload: { reason, at: Date.now() },
  })
}

/**
 * Close the channel and clean up.
 */
export async function closeCallChannel(channel) {
  if (!channel) return
  try {
    await supabase.removeChannel(channel)
  } catch (err) {
    console.warn("Failed to close call channel:", err)
  }
}

/**
 * Broadcast a global "someone is calling you" invite to all members of a conversation.
 * Used on the Messages page to detect incoming calls.
 */
export async function broadcastIncomingCall(userId, payload) {
  const channel = supabase.channel(`incoming-calls:${userId}`)

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve()
    })
  })

  await channel.send({
    type: "broadcast",
    event: "incoming-call",
    payload,
  })

  // Keep the channel alive briefly, then clean up
  setTimeout(() => {
    supabase.removeChannel(channel)
  }, 1500)
}

/**
 * Subscribe to incoming call invites for a user.
 * Used by the receiver's Messages page.
 */
export async function broadcastCallCancelled(userId, payload) {
  const channel = supabase.channel(`incoming-calls:${userId}`)

  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve()
    })
  })

  await channel.send({
    type: "broadcast",
    event: "call-cancelled",
    payload,
  })

  setTimeout(() => {
    supabase.removeChannel(channel)
  }, 1500)
}

export function subscribeToIncomingCalls(userId, callbacks) {
  const { onIncoming, onCancelled } =
    typeof callbacks === "function"
      ? { onIncoming: callbacks, onCancelled: null }
      : callbacks || {}

  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
      onIncoming?.(payload)
    })
    .on("broadcast", { event: "call-cancelled" }, ({ payload }) => {
      onCancelled?.(payload)
    })
    .subscribe()

  return channel
}
