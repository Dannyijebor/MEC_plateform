import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY")
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET")

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !livekitApiKey ||
      !livekitApiSecret
    ) {
      throw new Error("Required server configuration is missing.")
    }

    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication session." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    const body = await req.json()
    const spaceId = body?.spaceId

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select(
        "id, host_id, title, status, visibility, max_speakers",
      )
      .eq("id", spaceId)
      .single()

    if (spaceError || !space) {
      return new Response(
        JSON.stringify({ error: "Space not found." }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    const { data: participant } = await supabase
      .from("space_participants")
      .select("role, left_at")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .maybeSingle()

    const isHost = space.host_id === user.id

    if (!isHost && !participant) {
      if (space.visibility === "selected") {
        const { data: invited } = await supabase
          .from("space_invited_members")
          .select("id")
          .eq("space_id", spaceId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (!invited) {
          return new Response(
            JSON.stringify({
              error: "You are not invited to this Space.",
            }),
            {
              status: 403,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          )
        }
      }
    }

    if (space.status !== "live") {
      return new Response(
        JSON.stringify({
          error: "This Space is not currently live.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      )
    }

    const role = isHost
      ? "host"
      : participant?.role || "listener"

    const canPublish =
      role === "host" ||
      role === "cohost" ||
      role === "speaker"

    const token = new AccessToken(
      livekitApiKey,
      livekitApiSecret,
      {
        identity: user.id,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          user.id,
        ttl: "2h",
      },
    )

    token.addGrant({
      roomJoin: true,
      room: `mec-space-${space.id}`,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await token.toJwt()

    return new Response(
      JSON.stringify({
        token: jwt,
        roomName: `mec-space-${space.id}`,
        identity: user.id,
        role,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("LiveKit token error:", error)

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to create LiveKit token.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    )
  }
})
