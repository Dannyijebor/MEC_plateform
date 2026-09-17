import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

const GRACE_MS = 5 * 60 * 1000 // 5 minutes

export function usePresence(currentUser) {
  const [onlineUsers, setOnlineUsers] = useState(() => new Set())
  const lastSeenRef = useRef(new Map()) // userId -> timestamp
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!currentUser?.id) return

    let channel = null
    let interval = null
    let ticker = null

    try {
      channel = supabase.channel("presence:global", {
        config: { presence: { key: currentUser.id } },
      })

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel.presenceState()
            const presentIds = Object.keys(state || {})
            const now = Date.now()

            // Update last-seen timestamps for present users
            for (const id of presentIds) {
              lastSeenRef.current.set(id, now)
            }

            // Compute effective online set (present OR seen within grace period)
            const effective = new Set()
            for (const [id, ts] of lastSeenRef.current.entries()) {
              if (now - ts < GRACE_MS) effective.add(id)
            }
            setOnlineUsers(effective)
          } catch (err) {
            console.warn("[Presence] Sync error:", err)
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                user_id: currentUser.id,
                online_at: new Date().toISOString(),
              })
            } catch (e) {
              console.warn("[Presence] Track error:", e)
            }
          }
        })

      // Heartbeat every 30s so we don't get marked as idle
      interval = setInterval(() => {
        try {
          channel?.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          })
        } catch {}
      }, 30000)

      // Refresh the effective set every 30s (so grace period actually expires)
      ticker = setInterval(() => {
        const now = Date.now()
        const effective = new Set()
        for (const [id, ts] of lastSeenRef.current.entries()) {
          if (now - ts < GRACE_MS) effective.add(id)
        }
        setOnlineUsers(effective)
      }, 30000)
    } catch (err) {
      console.warn("[Presence] Channel setup failed:", err)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (ticker) clearInterval(ticker)
      try {
        if (channel) supabase.removeChannel(channel)
      } catch {}
    }
  }, [currentUser?.id])

  return onlineUsers
}
