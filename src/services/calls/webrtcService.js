const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun1.l.google.com:19302",
  },
]

export function createPeerConnection({
  onIceCandidate,
  onTrack,
  onConnectionStateChange,
} = {}) {
  const peerConnection = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  })

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate)
    }
  }

  peerConnection.ontrack = (event) => {
    if (onTrack && event.streams?.[0]) {
      onTrack(event.streams[0])
    }
  }

  peerConnection.onconnectionstatechange = () => {
    if (onConnectionStateChange) {
      onConnectionStateChange(peerConnection.connectionState)
    }
  }

  return peerConnection
}

export async function getLocalMedia({
  audio = true,
  video = false,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera and microphone access is not supported by this browser.",
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio,
      video,
    })
  } catch (error) {
    if (error?.name === "NotAllowedError") {
      throw new Error(
        "Microphone or camera permission was denied. Please allow access and try again.",
      )
    }

    if (error?.name === "NotFoundError") {
      throw new Error(
        "No compatible microphone or camera was found on this device.",
      )
    }

    if (error?.name === "NotReadableError") {
      throw new Error(
        "The microphone or camera is already being used by another application.",
      )
    }

    throw error
  }
}

export async function createOffer(peerConnection) {
  if (!peerConnection) {
    throw new Error("Peer connection is not available.")
  }

  const offer = await peerConnection.createOffer()

  await peerConnection.setLocalDescription(offer)

  return offer
}

export async function createAnswer(peerConnection) {
  if (!peerConnection) {
    throw new Error("Peer connection is not available.")
  }

  const answer = await peerConnection.createAnswer()

  await peerConnection.setLocalDescription(answer)

  return answer
}

export async function setRemoteDescription(
  peerConnection,
  description,
) {
  if (!peerConnection || !description) return

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(description),
  )
}

export async function addIceCandidate(
  peerConnection,
  candidate,
) {
  if (!peerConnection || !candidate) return

  await peerConnection.addIceCandidate(
    new RTCIceCandidate(candidate),
  )
}

export function addLocalTracks(peerConnection, stream) {
  if (!peerConnection || !stream) return

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream)
  })
}

export function stopMediaStream(stream) {
  if (!stream) return

  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

export function closePeerConnection(peerConnection) {
  if (!peerConnection) return

  peerConnection.onicecandidate = null
  peerConnection.ontrack = null
  peerConnection.onconnectionstatechange = null

  peerConnection.close()
}
