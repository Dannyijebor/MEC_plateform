// MEC Platform — Push Notification Sender
// Triggered by a database webhook when a new message is inserted.
// Looks up the recipient's push subscription and dispatches a Web Push.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import webpush from "https://esm.sh/web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@mec-platform.app"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    // Supabase webhook payload shape: { type: "INSERT"|"UPDATE"|"DELETE", table, record, old_record, ... }
    const record = body.record || body.new || body
    const type = body.type || "INSERT"

    if (!record || type !== "INSERT") {
      return new Response(JSON.stringify({ ok: false, reason: "not an insert" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Skip if it's a call event or theme event message (handled separately or ignored)
    const content: string = record.content || ""
    if (content.startsWith("[MEC_CALL]") || content.startsWith("[MEC_THEME]")) {
      return new Response(JSON.stringify({ ok: false, reason: "system message" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const conversationId = record.conversation_id
    const senderId = record.sender_id

    if (!conversationId || !senderId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing ids" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // 1. Find the other participant(s) in the conversation
    const { data: members, error: membersError } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId)

    if (membersError) throw membersError
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: "no recipients" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // 2. Get sender's name for the notification body
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", senderId)
      .single()

    const senderName =
      senderProfile?.full_name || senderProfile?.username || "MEC Member"

    // 3. Send a push to every recipient's subscriptions
    const results = []

    for (const member of members) {
      const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", member.user_id)

      if (subsError || !subs) {
        results.push({ user_id: member.user_id, sent: 0 })
        continue
      }

      for (const row of subs) {
        const sub = row.subscription
        if (!sub?.endpoint) continue

        const payload = JSON.stringify({
          type: "message",
          title: senderName,
          body: content || "Sent you a message",
          url: `/messages?conversation=${conversationId}`,
          conversationId,
          tag: `mec-msg-${conversationId}`,
        })

        try {
          await webpush.sendNotification(sub, payload)
          results.push({ user_id: member.user_id, sent: 1 })
        } catch (err) {
          const status = err?.statusCode
          // 404 / 410 mean the subscription is stale — clean it up
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", row.id)
          }
          results.push({ user_id: member.user_id, sent: 0, error: String(err) })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("push-notify error:", err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})
