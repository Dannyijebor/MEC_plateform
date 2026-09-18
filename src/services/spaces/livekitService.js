import { Room, RoomEvent } from "livekit-client"
import { supabase } from "../../lib/supabase"

const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880"

export async function getLiveKitToken(spaceId) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError

  if (!session?.access_token) {
    throw new Error("Your MEC session has expired. Please sign in again.")
  }

  const { data, error } = await supabase.functions.invoke(
    "smart-worker",
    {
      body: { spaceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  )

  if (error) throw error

  if (!data?.token) {
    throw new Error(data?.error || "Unable to obtain LiveKit access.")
  }

  return data
}

export async function connectToSpace({
  spaceId,
  onParticipantConnected,
  onParticipantDisconnected,
  onTrackSubscribed,
  onTrackUnsubscribed,
  onActiveSpeakersChanged,
  onConnectionStateChanged,
}) {
  const { token, roomName } = await getLiveKitToken(spaceId)

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  })

  room.on(
    RoomEvent.ParticipantConnected,
    (participant) => {
      onParticipantConnected?.(participant)
    },
  )

  room.on(
    RoomEvent.ParticipantDisconnected,
    (participant) => {
      onParticipantDisconnected?.(participant)
    },
  )

  room.on(
    RoomEvent.TrackSubscribed,
    (track, publication, participant) => {
      onTrackSubscribed?.(track, publication, participant)
    },
  )

  room.on(
    RoomEvent.TrackUnsubscribed,
    (track, publication, participant) => {
      onTrackUnsubscribed?.(track, publication, participant)
    },
  )

  room.on(
    RoomEvent.ActiveSpeakersChanged,
    (speakers) => {
      onActiveSpeakersChanged?.(speakers)
    },
  )

  room.on(
    RoomEvent.ConnectionStateChanged,
    (state) => {
      onConnectionStateChanged?.(state)
    },
  )

  await room.connect(LIVEKIT_URL, token)

  return {
    room,
    roomName,
  }
}

export async function enableMicrophone(room) {
  if (!room) return
  await room.localParticipant.setMicrophoneEnabled(true)
}

export async function disableMicrophone(room) {
  if (!room) return
  await room.localParticipant.setMicrophoneEnabled(false)
}

export async function enableCamera(room) {
  if (!room) return
  await room.localParticipant.setCameraEnabled(true)
}

export async function disableCamera(room) {
  if (!room) return
  await room.localParticipant.setCameraEnabled(false)
}

export async function toggleMicrophone(room) {
  if (!room) return false

  const enabled =
    room.localParticipant.isMicrophoneEnabled

  const next = !enabled

  await room.localParticipant.setMicrophoneEnabled(next)

  return next
}

export async function toggleCamera(room) {
  if (!room) return false

  const enabled =
    room.localParticipant.isCameraEnabled

  const next = !enabled

  await room.localParticipant.setCameraEnabled(next)

  return next
}

export async function disconnectFromSpace(room) {
  if (!room) return

  room.disconnect()
}
