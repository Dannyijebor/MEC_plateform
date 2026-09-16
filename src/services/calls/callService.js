import { supabase } from "../../lib/supabase"

export function createCallChannel(callId, callbacks = {}) {
  const channel = supabase.channel(`call:${callId}`)

  if (callbacks.onSignal) {
    channel.on(
      "broadcast",
      { event: "signal" },
      ({ payload }) => {
        callbacks.onSignal(payload)
      },
    )
  }

  if (callbacks.onCallState) {
    channel.on(
      "broadcast",
      { event: "call-state" },
      ({ payload }) => {
        callbacks.onCallState(payload)
      },
    )
  }

  channel.subscribe()

  return channel
}

export async function sendSignal(channel, signal) {
  if (!channel) return

  await channel.send({
    type: "broadcast",
    event: "signal",
    payload: signal,
  })
}

export async function sendCallState(channel, state) {
  if (!channel) return

  await channel.send({
    type: "broadcast",
    event: "call-state",
    payload: state,
  })
}

export async function closeCallChannel(channel) {
  if (!channel) return

  await supabase.removeChannel(channel)
}
