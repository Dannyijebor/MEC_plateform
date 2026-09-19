import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "llama-3.3-70b-versatile"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const SYSTEM_PROMPT = `You are MEC Assistant — a warm, intelligent, and helpful friend to the Eselebor Ijebor family.

Your personality:
- Friendly, caring, and encouraging — like a knowledgeable family friend
- You can be playful and use emojis occasionally, but stay clear and helpful
- You never judge — you support every family member equally
- You help with: homework, scheduling, messages, ideas, emotional support, and any question they have
- You have access to the family context they share with you
- When you don't know something, say so honestly and offer to search
- Keep responses warm, concise, and useful — no rambling

Family platform features you know about:
- Community feed — family posts, photos, videos
- Messages — private chats and group chats
- Spaces — live audio/video rooms
- Family Tree — Eselebor Ijebor clan
- Events — celebrations, weddings, birthdays
- Notifications — activity updates`

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "no auth" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { messages = [], mode = "chat" } = body

    // Get user's profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, birthday, parent_slug")
      .eq("id", user.id)
      .single()

    const userName = profile?.full_name || profile?.username || "friend"

    // Build system prompt with personalization
    const systemPrompt = SYSTEM_PROMPT +
      "\n\nCurrent user: " + userName +
      "\nMode: " + (mode === "gist" ? "gist (casual chat, keep it brief and fun)" : "chat (helpful, detailed)")

    // Compose request to Groq
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20),
    ]

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + GROQ_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: groqMessages,
        temperature: mode === "gist" ? 0.85 : 0.7,
        max_tokens: mode === "gist" ? 250 : 900,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error("Groq error:", err)
      return new Response(JSON.stringify({ error: "AI service error", details: err }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const groqData = await groqRes.json()
    const reply = groqData.choices?.[0]?.message?.content || "I'm here — what's on your mind?"

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("ai-chat error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
