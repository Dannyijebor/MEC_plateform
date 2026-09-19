import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? ""
const MODEL = "openai/gpt-oss-120b"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const body = await req.json()
    console.log("=== REQUEST RECEIVED ===", JSON.stringify(body).slice(0, 300))
    console.log("key prefix:", GROQ_API_KEY.slice(0, 8), "len:", GROQ_API_KEY.length)

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: body.messages ?? [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    const text = await r.text()
    console.log("Groq status:", r.status, "body:", text.slice(0, 600))

    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: "groq_failed", status: r.status, detail: text.slice(0, 400) }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      )
    }

    const reply = JSON.parse(text).choices?.[0]?.message?.content ?? ""
    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("THROWN:", e?.stack ?? e)
    return new Response(
      JSON.stringify({ error: "exception", detail: String(e?.message ?? e) }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
