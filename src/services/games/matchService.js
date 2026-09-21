import { supabase } from "../../lib/supabase"

function rolesFor(players) {
  return { A: players[0], B: players[1] }
}

export function initialStateForAyo(players) {
  return {
    board: Array(12).fill(4),
    captures: { A: 0, B: 0 },
    roles: rolesFor(players),
    lastMove: null,
    moveCount: 0,
  }
}

export const INVITE_TTL_MINUTES = 60

export async function createAyoMatch(userId) {
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_MINUTES * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase
    .from("game_matches")
    .insert({
      game_id: "ayo",
      status: "waiting",
      players: [userId],
      current_turn: userId,
      state: initialStateForAyo([userId, null]),
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function joinAyoMatch(matchId, userId) {
  const { data: match, error: loadErr } = await supabase
    .from("game_matches")
    .select("*")
    .eq("id", matchId)
    .single()

  if (loadErr) throw loadErr
  if (!match) throw new Error("Match not found")
  if (match.status !== "waiting") throw new Error("Match already started")
  if (match.players.includes(userId)) return match

  const newPlayers = [...match.players, userId]
  const newState = { ...match.state, roles: rolesFor(newPlayers) }

  const { data, error } = await supabase
    .from("game_matches")
    .update({
      players: newPlayers,
      status: "active",
      state: newState,
      current_turn: newState.roles.A,
    })
    .eq("id", matchId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelAyoMatch(matchId, userId) {
  const { data, error } = await supabase
    .from("game_matches")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("status", "waiting")
    .contains("players", [userId])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function expireAyoMatch(matchId) {
  const { error } = await supabase
    .from("game_matches")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("status", "waiting")
  if (error) throw error
}

export async function getMatch(matchId) {
  const { data, error } = await supabase
    .from("game_matches")
    .select("*")
    .eq("id", matchId)
    .single()
  if (error) throw error
  return data
}

export async function listMyMatches(userId) {
  const { data, error } = await supabase
    .from("game_matches")
    .select("*")
    .contains("players", [userId])
    .in("status", ["waiting", "active"])
    .order("updated_at", { ascending: false })
  if (error) throw error
  const now = Date.now()
  return (data || []).filter((m) => {
    if (
      m.status === "waiting" &&
      m.expires_at &&
      new Date(m.expires_at).getTime() < now
    ) {
      return false
    }
    return true
  })
}

export async function listOpenChallenges(userId) {
  const { data, error } = await supabase
    .from("game_matches")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw error
  const now = Date.now()
  return (data || []).filter((m) => {
    if (m.players.includes(userId)) return false
    if (m.expires_at && new Date(m.expires_at).getTime() < now) return false
    return true
  })
}

export async function submitMove(matchId, moverId, newState, nextTurnUserId) {
  const { data, error } = await supabase
    .from("game_matches")
    .update({
      state: newState,
      current_turn: nextTurnUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("current_turn", moverId)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") throw new Error("It's no longer your turn")
    throw error
  }
  return data
}

export async function finishMatch(matchId, winnerId) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("game_matches")
    .update({
      status: "finished",
      winner: winnerId,
      finished_at: now,
      updated_at: now,
    })
    .eq("id", matchId)
    .select()
    .single()

  if (error) throw error

  if (winnerId) {
    const { error: rpcError } = await supabase.rpc("record_ayo_result", {
      p_match_id: matchId,
      p_winner: winnerId,
    })
    if (rpcError) console.error("RPC record_ayo_result failed:", rpcError)
  }

  return data
}

export function subscribeToMatch(matchId, onChange) {
  const channel = supabase
    .channel("match-" + matchId)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_matches",
        filter: "id=eq." + matchId,
      },
      (payload) => onChange(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
