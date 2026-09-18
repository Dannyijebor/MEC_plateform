// MEC Platform Service Worker
// Handles push notifications for messages and incoming calls

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// ─────────────────────────────────────────────
// PUSH: message or call notification arrives
// ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (err) {
    data = { title: "MEC Platform", body: event.data?.text() || "You have a new notification" }
  }

  const type = data.type || "message"
  const isCall = type === "call"

  const title = data.title || (isCall ? "Incoming call" : "New message")
  const body = data.body || (isCall ? "Someone is calling you" : "You have a new message")

  const options = {
    body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-72x72.png",
    tag: data.tag || (isCall ? "mec-call" : `mec-msg-${data.conversationId || "x"}`),
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [500, 200, 500, 200, 500] : [200, 100, 200],
    data: {
      url: data.url || "/messages",
      type,
      conversationId: data.conversationId,
    },
    actions: isCall
      ? [
          { action: "accept", title: "Answer", icon: "/icons/phone.png" },
          { action: "decline", title: "Decline", icon: "/icons/phone-off.png" },
        ]
      : [
          { action: "open", title: "Open" },
        ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ─────────────────────────────────────────────
// NOTIFICATION CLICK: open the app
// ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}
  const url = data.url || "/messages"

  // Handle call actions
  if (action === "accept") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus().then(() => {
              client.postMessage({ type: "call-accept", url })
            })
          }
        }
        return clients.openWindow(url + "&autoAccept=true")
      })
    )
    return
  }

  if (action === "decline") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus().then(() => {
              client.postMessage({ type: "call-decline", url })
            })
          }
        }
        return Promise.resolve()
      })
    )
    return
  }

  // Default: open the URL
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if we have one
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus().then(() => {
            client.postMessage({ type: "open-url", url })
          })
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url)
    })
  )
})

// ─────────────────────────────────────────────
// MESSAGE from the page (for subscription renewal etc.)
// ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") {
    self.skipWaiting()
  }
})
