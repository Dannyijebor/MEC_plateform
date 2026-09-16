import {
  Image,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Send,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

function Community() {
  const { user } = useAuth()

  const [postText, setPostText] = useState("")
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [posts, setPosts] = useState([])
  const [reactionCounts, setReactionCounts] = useState({})
  const [userReactions, setUserReactions] = useState({})
  const [commentCounts, setCommentCounts] = useState({})
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [likingPostId, setLikingPostId] = useState(null)
  const [commentingPostId, setCommentingPostId] = useState(null)
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState(null)
  const [error, setError] = useState("")

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError("")

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        author_id,
        content,
        media_url,
        media_type,
        created_at,
        expires_at,
        profiles:author_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Unable to load posts:", error)
      setError("Unable to load the community feed.")
      setPosts([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    const loadedPosts = data ?? []

    const postsWithMediaUrls = await Promise.all(
      loadedPosts.map(async (post) => {
        if (!post.media_url) {
          return post
        }

        const { data: signedData, error: signedError } =
          await supabase.storage
            .from("community-media")
            .createSignedUrl(post.media_url, 60 * 60)

        if (signedError) {
          console.error("Unable to create media URL:", signedError)
          return post
        }

        return {
          ...post,
          media_display_url: signedData?.signedUrl ?? null,
        }
      })
    )

    setPosts(postsWithMediaUrls)

    if (postsWithMediaUrls.length > 0) {
      const postIds = postsWithMediaUrls.map((post) => post.id)

      const { data: reactions, error: reactionsError } = await supabase
        .from("post_reactions")
        .select("post_id, user_id")
        .in("post_id", postIds)

      if (!reactionsError) {
        const counts = {}
        const mine = {}

        for (const reaction of reactions ?? []) {
          counts[reaction.post_id] =
            (counts[reaction.post_id] ?? 0) + 1

          if (reaction.user_id === user?.id) {
            mine[reaction.post_id] = true
          }
        }

        setReactionCounts(counts)
        setUserReactions(mine)
      }

      const { data: postComments, error: commentsError } = await supabase
        .from("post_comments")
        .select("id, post_id")
        .in("post_id", postIds)

      if (!commentsError) {
        const counts = {}

        for (const comment of postComments ?? []) {
          counts[comment.post_id] =
            (counts[comment.post_id] ?? 0) + 1
        }

        setCommentCounts(counts)
      }
    } else {
      setReactionCounts({})
      setUserReactions({})
      setCommentCounts({})
    }

    setLoading(false)
    setRefreshing(false)
  }, [user?.id])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleMediaSelect = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please select an image or video.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Media must be smaller than 50 MB.")
      return
    }

    setError("")
    setSelectedMedia(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const removeSelectedMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }

    setSelectedMedia(null)
    setMediaPreview(null)
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()

    const content = postText.trim()

    if (!content && !selectedMedia) return
    if (!user) return

    setError("")

    setError("")

    let mediaUrl = null
    let mediaType = null

    if (selectedMedia) {
      const fileExtension =
        selectedMedia.name.split(".").pop()?.toLowerCase() || "bin"

      const filePath =
        `${user.id}/${crypto.randomUUID()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage
        .from("community-media")
        .upload(filePath, selectedMedia, {
          contentType: selectedMedia.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("Unable to upload media:", uploadError)
        setError("Unable to upload your media.")
        return
      }

      mediaUrl = filePath
      mediaType = selectedMedia.type
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        content: content || null,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select(`
        id,
        author_id,
        content,
        media_url,
        media_type,
        created_at,
        expires_at,
        profiles:author_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("Unable to create post:", error)
      setError("Unable to publish your post.")
      return
    }

    setPosts((currentPosts) => [data, ...currentPosts])

    setReactionCounts((current) => ({
      ...current,
      [data.id]: 0,
    }))

    setCommentCounts((current) => ({
      ...current,
      [data.id]: 0,
    }))

    setPostText("")
    removeSelectedMedia()
  }

  const handleLike = async (postId) => {
    if (!user || likingPostId) return

    setLikingPostId(postId)
    setError("")

    const alreadyLiked = Boolean(userReactions[postId])

    if (alreadyLiked) {
      const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Unable to remove reaction:", error)
        setError("Unable to update your reaction.")
        setLikingPostId(null)
        return
      }

      setUserReactions((current) => ({
        ...current,
        [postId]: false,
      }))

      setReactionCounts((current) => ({
        ...current,
        [postId]: Math.max((current[postId] ?? 1) - 1, 0),
      }))
    } else {
      const { error } = await supabase
        .from("post_reactions")
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: "like",
        })

      if (error) {
        console.error("Unable to add reaction:", error)
        setError("Unable to like this post.")
        setLikingPostId(null)
        return
      }

      setUserReactions((current) => ({
        ...current,
        [postId]: true,
      }))

      setReactionCounts((current) => ({
        ...current,
        [postId]: (current[postId] ?? 0) + 1,
      }))
    }

    setLikingPostId(null)
  }

  const loadComments = async (postId) => {
    setLoadingCommentsPostId(postId)
    setError("")

    const { data, error } = await supabase
      .from("post_comments")
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        profiles:author_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Unable to load comments:", error)
      setError("Unable to load comments.")
    } else {
      setComments((current) => ({
        ...current,
        [postId]: data ?? [],
      }))
    }

    setLoadingCommentsPostId(null)
  }

  const toggleComments = async (postId) => {
    const isOpen = Boolean(openComments[postId])

    setOpenComments((current) => ({
      ...current,
      [postId]: !isOpen,
    }))

    if (!isOpen && comments[postId] === undefined) {
      await loadComments(postId)
    }
  }

  const handleComment = async (event, postId) => {
    event.preventDefault()

    const content = (commentInputs[postId] ?? "").trim()

    if (!content || !user) return

    setCommentingPostId(postId)
    setError("")

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
      })
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        profiles:author_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("Unable to create comment:", error)
      setError("Unable to post your comment.")
      setCommentingPostId(null)
      return
    }

    setComments((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), data],
    }))

    setCommentCounts((current) => ({
      ...current,
      [postId]: (current[postId] ?? 0) + 1,
    }))

    setCommentInputs((current) => ({
      ...current,
      [postId]: "",
    }))

    setOpenComments((current) => ({
      ...current,
      [postId]: true,
    }))

    setCommentingPostId(null)
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const difference = Math.floor((now - date) / 1000)

    if (difference < 60) return "Just now"
    if (difference < 3600) {
      return `${Math.floor(difference / 60)}m ago`
    }
    if (difference < 86400) {
      return `${Math.floor(difference / 3600)}h ago`
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm(
      "Delete this post? This action cannot be undone."
    )

    if (!confirmed) return

    const postToDelete = posts.find((post) => post.id === postId)

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)

    if (error) {
      console.error("Unable to delete post:", error)
      window.alert("Unable to delete the post. Please try again.")
      return
    }

    if (postToDelete?.media_url) {
      const { error: mediaDeleteError } = await supabase.storage
        .from("community-media")
        .remove([postToDelete.media_url])

      if (mediaDeleteError) {
        console.error(
          "Post deleted, but media cleanup failed:",
          mediaDeleteError
        )
      }
    }

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    )

    setReactionCounts((current) => {
      const next = { ...current }
      delete next[postId]
      return next
    })

    setUserReactions((current) => {
      const next = { ...current }
      delete next[postId]
      return next
    })

    setCommentCounts((current) => {
      const next = { ...current }
      delete next[postId]
      return next
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d9b86c]/70">
            MEC Community
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#f7f3ea] sm:text-3xl">
            Family Feed
          </h1>
        </div>

        <button
          type="button"
          onClick={() => loadPosts(true)}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-[#f7f3ea]/60 transition hover:bg-white/[0.07] hover:text-[#f7f3ea] disabled:opacity-50"
          aria-label="Refresh community"
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreatePost}
        className="rounded-2xl border border-white/[0.07] bg-[#11182b]/75 p-4 shadow-xl backdrop-blur-xl"
      >
        <textarea
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          placeholder="Share something with the family..."
          rows={3}
          className="w-full resize-none bg-transparent text-sm leading-6 text-[#f7f3ea] outline-none placeholder:text-[#f7f3ea]/30"
        />

        {mediaPreview && (
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/[0.07]">
            {selectedMedia?.type.startsWith("video") ? (
              <video
                src={mediaPreview}
                controls
                className="max-h-72 w-full object-cover"
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Selected media preview"
                className="max-h-72 w-full object-cover"
              />
            )}

            <button
              type="button"
              onClick={removeSelectedMedia}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur"
              aria-label="Remove selected media"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs text-[#f7f3ea]/50 transition hover:bg-white/[0.05] hover:text-[#d9b86c]">
            <Image size={16} />
            Add media
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
          </label>

          <button
            type="submit"
            disabled={!postText.trim() && !selectedMedia}
            className="flex items-center gap-2 rounded-xl bg-[#d9b86c] px-4 py-2.5 text-xs font-semibold text-[#17130a] transition hover:bg-[#e5c87f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} />
            Post
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#f7f3ea]/50">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-14 text-center">
          <p className="text-sm text-[#f7f3ea]/50">
            No posts yet. Be the first to share something with the family.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const profile = post.profiles
            const name = profile?.full_name || "MEC Member"

            const initials = name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            const liked = Boolean(userReactions[post.id])
            const likes = reactionCounts[post.id] ?? 0
            const totalComments = commentCounts[post.id] ?? 0
            const isCommentsOpen = Boolean(openComments[post.id])

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11182b]/70 shadow-xl backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d9b86c]/20 bg-[#d9b86c]/10 text-xs font-semibold text-[#d9b86c]">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#f7f3ea]">
                        {name}
                      </p>

                      <p className="text-xs text-[#f7f3ea]/35">
                        {formatTime(post.created_at)}
                      </p>
                    </div>
                  </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#f7f3ea]/35 transition hover:bg-white/[0.05] hover:text-[#f7f3ea]"
                    aria-label="Post options"
                  >
                    <MoreHorizontal size={17} />
                  </button>
            {user?.id === post.author_id && (
              <button
                type="button"
                onClick={() => handleDeletePost(post.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f7f3ea]/35 transition hover:bg-red-500/10 hover:text-red-400"
                aria-label="Delete post"
                title="Delete post"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
                </div>

                {post.content && (
                  <div className="px-4 pb-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#f7f3ea]/80">
                      {post.content}
                    </p>
                  </div>
                )}

                {post.media_display_url && (
                  <div className="border-y border-white/[0.06]">
                    {post.media_type?.startsWith("video") ? (
                      <video
                        src={post.media_display_url}
                        controls
                        className="max-h-[520px] w-full object-cover"
                      />
                    ) : (
                      <img
                        src={post.media_display_url}
                        alt=""
                        className="max-h-[520px] w-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleLike(post.id)}
                    disabled={likingPostId === post.id}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                      liked
                        ? "bg-[#d9b86c]/10 text-[#d9b86c]"
                        : "text-[#f7f3ea]/45 hover:bg-white/[0.05] hover:text-[#f7f3ea]/80"
                    }`}
                  >
                    {likingPostId === post.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ThumbsUp
                        size={15}
                        fill={liked ? "currentColor" : "none"}
                      />
                    )}

                    {likes > 0 && <span>{likes}</span>}
                    <span>Like</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                      isCommentsOpen
                        ? "bg-white/[0.06] text-[#d9b86c]"
                        : "text-[#f7f3ea]/45 hover:bg-white/[0.05] hover:text-[#f7f3ea]/80"
                    }`}
                  >
                    <MessageCircle size={15} />
                    {totalComments > 0 && (
                      <span>{totalComments}</span>
                    )}
                    <span>Comment</span>
                  </button>
                </div>

                {isCommentsOpen && (
                  <div className="border-t border-white/[0.06] bg-black/[0.08]">
                    <div className="max-h-80 space-y-3 overflow-y-auto p-4">
                      {loadingCommentsPostId === post.id ? (
                        <div className="flex justify-center py-4 text-[#f7f3ea]/40">
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                        </div>
                      ) : (comments[post.id] ?? []).length === 0 ? (
                        <p className="py-3 text-center text-xs text-[#f7f3ea]/35">
                          No comments yet.
                        </p>
                      ) : (
                        (comments[post.id] ?? []).map((comment) => {
                          const commentProfile = comment.profiles
                          const commentName =
                            commentProfile?.full_name || "MEC Member"

                          return (
                            <div
                              key={comment.id}
                              className="flex gap-3"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d9b86c]/10 text-[10px] font-semibold text-[#d9b86c]">
                                {commentName
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.035] px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-semibold text-[#f7f3ea]">
                                    {commentName}
                                  </p>

                                  <span className="shrink-0 text-[10px] text-[#f7f3ea]/25">
                                    {formatTime(comment.created_at)}
                                  </span>
                                </div>

                                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#f7f3ea]/65">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <form
                      onSubmit={(event) =>
                        handleComment(event, post.id)
                      }
                      className="flex items-center gap-2 border-t border-white/[0.06] p-3"
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] ?? ""}
                        onChange={(event) =>
                          setCommentInputs((current) => ({
                            ...current,
                            [post.id]: event.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 text-xs text-[#f7f3ea] outline-none placeholder:text-[#f7f3ea]/25 focus:border-[#d9b86c]/30"
                      />

                      <button
                        type="submit"
                        disabled={
                          !(commentInputs[post.id] ?? "").trim() ||
                          commentingPostId === post.id
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d9b86c] text-[#17130a] transition hover:bg-[#e5c87f] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Send comment"
                      >
                        {commentingPostId === post.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Community
