import { supabase } from "../../lib/supabase"

export async function createSpace({
  hostId,
  title,
  description = "",
  mode = "audio",
  visibility = "family",
  theme = "gold",
  customThemeColor = null,
  status = "live",
  scheduledFor = null,
  maxCohosts = 3,
  maxSpeakers = 20,
}) {
  const { data, error } = await supabase
    .from("spaces")
    .insert({
      host_id: hostId,
      title: title.trim(),
      description: description?.trim() || null,
      mode,
      visibility,
      theme,
      custom_theme_color: customThemeColor,
      status,
      scheduled_for: scheduledFor,
      max_cohosts: maxCohosts,
      max_speakers: maxSpeakers,
      started_at: status === "live" ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw error

  const { error: participantError } = await supabase
    .from("space_participants")
    .insert({
      space_id: data.id,
      user_id: hostId,
      role: "host",
      audio_enabled: true,
      video_enabled: mode !== "audio",
    })

  if (participantError) throw participantError

  return data
}

export async function getSpaces() {
  const { data, error } = await supabase
    .from("spaces")
    .select(`
      *,
      host:host_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .in("status", ["live", "scheduled"])
    .order("scheduled_for", { ascending: true, nullsFirst: true })

  if (error) throw error

  return data || []
}

export async function getSpace(spaceId) {
  const { data, error } = await supabase
    .from("spaces")
    .select(`
      *,
      host:host_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("id", spaceId)
    .single()

  if (error) throw error

  return data
}

export async function joinSpace({
  spaceId,
  userId,
  role = "listener",
  audioEnabled = false,
  videoEnabled = false,
}) {
  const { data, error } = await supabase
    .from("space_participants")
    .upsert(
      {
        space_id: spaceId,
        user_id: userId,
        role,
        audio_enabled: audioEnabled,
        video_enabled: videoEnabled,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        onConflict: "space_id,user_id",
      },
    )
    .select()
    .single()

  if (error) throw error

  return data
}

export async function leaveSpace(spaceId, userId) {
  const { error } = await supabase
    .from("space_participants")
    .update({
      left_at: new Date().toISOString(),
    })
    .eq("space_id", spaceId)
    .eq("user_id", userId)

  if (error) throw error
}

export async function getParticipants(spaceId) {
  const { data, error } = await supabase
    .from("space_participants")
    .select(`
      *,
      profile:user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("space_id", spaceId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })

  if (error) throw error

  return data || []
}

export async function sendReaction({
  spaceId,
  userId,
  userName,
  emoji,
}) {
  const { data, error } = await supabase
    .from("space_reactions")
    .insert({
      space_id: spaceId,
      user_id: userId,
      user_name: userName,
      emoji,
    })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function raiseHand(spaceId, userId, userName, raised = true) {
  // Upsert: insert or update the raise state
  const { data, error } = await supabase
    .from("space_hand_raises")
    .upsert(
      {
        space_id: spaceId,
        user_id: userId,
        user_name: userName,
        raised,
      },
      { onConflict: "space_id,user_id" }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function endSpace(spaceId) {
  const { data, error } = await supabase
    .from("spaces")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", spaceId)
    .select()
    .single()

  if (error) throw error

  return data
}

/**
 * Update a participant's role in a space.
 * allowedRoles: host, cohost, speaker, listener
 */
export async function updateParticipantRole({ spaceId, userId, newRole }) {
  if (!spaceId || !userId || !newRole) return

  const { error } = await supabase
    .from("space_participants")
    .update({ role: newRole })
    .eq("space_id", spaceId)
    .eq("user_id", userId)

  if (error) throw error
}

/**
 * Remove a participant entirely from a space.
 */
export async function removeParticipant({ spaceId, userId }) {
  if (!spaceId || !userId) return

  const { error } = await supabase
    .from("space_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("space_id", spaceId)
    .eq("user_id", userId)

  if (error) throw error
}
