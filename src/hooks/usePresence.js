import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export function usePresence(currentUser) {
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  useEffect(() => {
    if (!currentUser?.id) return

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: currentUser.id } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setOnlineUsers(new Set(Object.keys(state)))
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    const interval = setInterval(() => {
      channel.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
      })
    }, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  return onlineUsers
}
