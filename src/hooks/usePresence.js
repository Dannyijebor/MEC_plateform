import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function usePresence(currentUser) {
  const [onlineUsers, setOnlineUsers] = useState(() => new Set())

  useEffect(() => {
    console.log("[Presence] Hook running. User:", currentUser?.id)

    if (!currentUser?.id) {
      console.log("[Presence] No user — skipping.")
      return
    }

    let channel = null
    let interval = null

    try {
      channel = supabase.channel("presence:global", {
        config: { presence: { key: currentUser.id } },
      })

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel.presenceState()
            const keys = Object.keys(state || {})
            console.log("[Presence] Sync. Online users:", keys)
            setOnlineUsers(new Set(keys))
          } catch (err) {
            console.warn("[Presence] Sync error:", err)
          }
        })
        .on("presence", { event: "join" }, ({ key }) => {
          console.log("[Presence] User joined:", key)
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          console.log("[Presence] User left:", key)
        })
        .subscribe(async (status, err) => {
          console.log("[Presence] Subscribe status:", status, err || "")
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                user_id: currentUser.id,
                online_at: new Date().toISOString(),
              })
              console.log("[Presence] Tracked successfully.")
            } catch (e) {
              console.warn("[Presence] Track error:", e)
            }
          }
        })

      interval = setInterval(() => {
        try {
          channel?.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          })
        } catch {}
      }, 30000)
    } catch (err) {
      console.warn("[Presence] Channel setup failed:", err)
    }

    return () => {
      console.log("[Presence] Cleaning up.")
      if (interval) clearInterval(interval)
      try {
        if (channel) supabase.removeChannel(channel)
      } catch {}
    }
  }, [currentUser?.id])

  return onlineUsers
}
