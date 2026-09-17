import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function usePresence(currentUser) {
  const [onlineUsers, setOnlineUsers] = useState(() => new Set())

  useEffect(() => {
    if (!currentUser?.id) return

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
            setOnlineUsers(new Set(Object.keys(state || {})))
          } catch (err) {
            console.warn("Presence sync error:", err)
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                user_id: currentUser.id,
                online_at: new Date().toISOString(),
              })
            } catch (err) {
              console.warn("Presence track error:", err)
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
      console.warn("Presence channel setup failed:", err)
    }

    return () => {
      if (interval) clearInterval(interval)
      try {
        if (channel) supabase.removeChannel(channel)
      } catch {}
    }
  }, [currentUser?.id])

  return onlineUsers
}
