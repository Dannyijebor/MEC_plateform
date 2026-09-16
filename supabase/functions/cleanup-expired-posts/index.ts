Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase server environment variables")
    }

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    }

    const expirationTime = new Date().toISOString()

    // Find expired posts.
    const postsResponse = await fetch(
      `${supabaseUrl}/rest/v1/posts?select=id,media_url&expires_at=lte.${encodeURIComponent(expirationTime)}`,
      {
        method: "GET",
        headers,
      },
    )

    if (!postsResponse.ok) {
      throw new Error(
        `Unable to find expired posts: ${await postsResponse.text()}`,
      )
    }

    const expiredPosts = await postsResponse.json()

    if (!expiredPosts || expiredPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired posts found.",
          expiredPostsFound: 0,
          mediaDeleted: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const mediaPaths = expiredPosts
      .map((post: { media_url?: string | null }) => post.media_url)
      .filter(
        (path: unknown): path is string =>
          typeof path === "string" && path.length > 0,
      )

    let mediaDeleted = 0

    // Delete media through the Supabase Storage API.
    if (mediaPaths.length > 0) {
      const storageResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/community-media`,
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            prefixes: mediaPaths,
          }),
        },
      )

      if (!storageResponse.ok) {
        throw new Error(
          `Storage cleanup failed: ${await storageResponse.text()}`,
        )
      }

      mediaDeleted = mediaPaths.length
    }

    // Delete expired posts.
    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/posts?expires_at=lte.${encodeURIComponent(expirationTime)}`,
      {
        method: "DELETE",
        headers: {
          ...headers,
          Prefer: "return=minimal",
        },
      },
    )

    if (!deleteResponse.ok) {
      throw new Error(
        `Post cleanup failed: ${await deleteResponse.text()}`,
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredPostsFound: expiredPosts.length,
        mediaDeleted,
        message: "Expired posts cleaned up successfully.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Cleanup failed:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
})
