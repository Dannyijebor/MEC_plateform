import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

const VAPID_PUBLIC_KEY =
  "BLrRfGT2EDtwCrHAMqEG0xdSmptL49tIrNl9ZmGBpkOvQT8gVttUm2FYDLbENvbwiwERKPbJ6quPVS_24JYRNuQ"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Registers the service worker and subscribes the current user to push notifications.
 * Stores the subscription in the `push_subscriptions` table.
 * @param {string} userId - the current user's id
 */
export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  )
  const [subscribed, setSubscribed] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (!userId) return
    if (busyRef.current) return

    let cancelled = false
    busyRef.current = true

    async function setup() {
      try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })

        await navigator.serviceWorker.ready
        if (cancelled) return

        // Ask permission
        let currentPermission = Notification.permission
        if (currentPermission === "default") {
          currentPermission = await Notification.requestPermission()
          setPermission(currentPermission)
        }
        if (currentPermission !== "granted") {
          busyRef.current = false
          return
        }

        // Check for an existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        if (cancelled) return

        // Save to Supabase (delete old + insert new for simplicity)
        const payload = subscription.toJSON()
        await supabase.from("push_subscriptions").delete().eq("user_id", userId)
        await supabase.from("push_subscriptions").insert({
          user_id: userId,
          subscription: payload,
        })

        setSubscribed(true)
      } catch (err) {
        console.warn("Push setup failed:", err)
      } finally {
        busyRef.current = false
      }
    }

    setup()

    return () => {
      cancelled = true
      busyRef.current = false
    }
  }, [userId])

  return { permission, subscribed }
}
