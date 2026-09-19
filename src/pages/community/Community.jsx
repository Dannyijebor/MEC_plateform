import {
  Camera,
  Edit3,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import UserProfileModal from "../../components/common/UserProfileModal"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"

function Community() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [postText, setPostText] = useState("")
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)

  const [viewingProfileId, setViewingProfileId] = useState(null)
  const [posts, setPosts] = useState([])
  const [reactionCounts, setReactionCounts] = useState({})
  const [userReactions, setUserReactions] = useState({})
  const [commentCounts, setCommentCounts] = useState({})
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [editingPostId, setEditingPostId] = useState(null)
  const [postMenuId, setPostMenuId] = useState(null)
  const [editingPostText, setEditingPostText] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState("")
  const [savingCommentEdit, setSavingCommentEdit] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [likingPostId, setLikingPostId] = useState(null)
  const [commentingPostId, setCommentingPostId] = useState(null)
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState(null)
  const [error, setError] = useState("")

  const fileInputRef = useRef(null)

  const loadPosts = useCallback(
    async (isRefresh = false) => {
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
        setError("Unable to load the family feed.")
        setPosts([])
        setLoading(false)
        setRefreshing(false)
        return
      }

      const loadedPosts = data ?? []

      const postsWithMediaUrls = await Promise.all(
        loadedPosts.map(async (post) => {
          if (!post.media_url) return post

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

        const { data: reactions, error: reactionsError } =
          await supabase
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

        const { data: postComments, error: commentsError } =
          await supabase
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
    },
    [user?.id]
  )

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

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

  const getInitials = (name) =>
    (name || "MEC")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  const handleMediaSelect = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      setError("Please select an image or video.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Media must be smaller than 50 MB.")
      return
    }

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
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

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()

    const content = postText.trim()

    if (!content && !selectedMedia) return
    if (!user) return

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

  const canEditPost = (post) => {
    if (!user || post.author_id !== user.id) return false

    const createdAt = new Date(post.created_at).getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000

    return Date.now() - createdAt < twentyFourHours
  }

  const startEditingPost = (post) => {
    if (!canEditPost(post)) {
      setError("Posts can only be edited within 24 hours of posting.")
      return
    }

    setError("")
    setEditingPostId(post.id)
    setEditingPostText(post.content ?? "")
  }

  const cancelEditingPost = () => {
    setEditingPostId(null)
    setEditingPostText("")
  }

  const handleEditPost = async (postId) => {
    const content = editingPostText.trim()

    if (!content) {
      setError("Post text cannot be empty.")
      return
    }

    const post = posts.find((item) => item.id === postId)

    if (!post || !canEditPost(post)) {
      setError("Posts can only be edited within 24 hours of posting.")
      cancelEditingPost()
      return
    }

    setSavingEdit(true)
    setError("")

    const { data, error } = await supabase
      .from("posts")
      .update({ content })
      .eq("id", postId)
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
      console.error("Unable to edit post:", error)
      setError(
        error.message?.includes("24 hours")
          ? "This post can no longer be edited."
          : "Unable to update your post."
      )
      setSavingEdit(false)
      return
    }

    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        currentPost.id === postId
          ? {
              ...data,
              media_display_url:
                currentPost.media_display_url ?? null,
            }
          : currentPost
      )
    )

    cancelEditingPost()
    setSavingEdit(false)
  }

  const canEditComment = (comment) => {
    if (!user || comment.author_id !== user.id) return false

    const createdAt = new Date(comment.created_at).getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000

    return Date.now() - createdAt < twentyFourHours
  }

  const startEditingComment = (comment) => {
    if (!canEditComment(comment)) {
      setError("Comments can only be edited within 24 hours of posting.")
      return
    }

    setError("")
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.content ?? "")
  }

  const cancelEditingComment = () => {
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const handleEditComment = async (comment) => {
    const content = editingCommentText.trim()

    if (!content) {
      setError("Comment cannot be empty.")
      return
    }

    if (!canEditComment(comment)) {
      setError("Comments can only be edited within 24 hours of posting.")
      cancelEditingComment()
      return
    }

    setSavingCommentEdit(true)
    setError("")

    const { data, error } = await supabase
      .from("post_comments")
      .update({ content })
      .eq("id", comment.id)
      .eq("author_id", user.id)
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
      console.error("Unable to edit comment:", error)
      setError(
        error.message?.includes("24 hours")
          ? "This comment can no longer be edited."
          : "Unable to update your comment."
      )
      setSavingCommentEdit(false)
      return
    }

    setComments((current) => ({
      ...current,
      [comment.post_id]: (current[comment.post_id] ?? []).map(
        (currentComment) =>
          currentComment.id === comment.id
            ? data
            : currentComment
      ),
    }))

    cancelEditingComment()
    setSavingCommentEdit(false)
  }

  const handleDeleteComment = async (comment) => {
    if (!user || comment.author_id !== user.id) return

    const confirmed = window.confirm(
      "Delete this comment? This action cannot be undone."
    )

    if (!confirmed) return

    setDeletingCommentId(comment.id)
    setError("")

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", comment.id)
      .eq("author_id", user.id)

    if (error) {
      console.error("Unable to delete comment:", error)
      setError("Unable to delete the comment. Please try again.")
      setDeletingCommentId(null)
      return
    }

    setComments((current) => ({
      ...current,
      [comment.post_id]: (current[comment.post_id] ?? []).filter(
        (currentComment) => currentComment.id !== comment.id
      ),
    }))

    setCommentCounts((current) => ({
      ...current,
      [comment.post_id]: Math.max(
        (current[comment.post_id] ?? 1) - 1,
        0
      ),
    }))

    if (editingCommentId === comment.id) {
      cancelEditingComment()
    }

    setDeletingCommentId(null)
  }

  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm(
      "Delete this post? This action cannot be undone."
    )

    if (!confirmed) return

    const postToDelete = posts.find(
      (post) => post.id === postId
    )

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
      const { error: mediaDeleteError } =
        await supabase.storage
          .from("community-media")
          .remove([postToDelete.media_url])

      if (mediaDeleteError) {
        console.error(
          "Post deleted, but media cleanup failed:",
          mediaDeleteError
        )
      }
    }

    setPosts((current) =>
      current.filter((post) => post.id !== postId)
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

  const mediaCount = useMemo(
    () =>
      posts.filter(
        (post) => Boolean(post.media_display_url)
      ).length,
    [posts]
  )

  return (
    <div className="min-h-full bg-[#F7F5EF] text-[#111827]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">

        {/* PAGE INTRO */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#2563EB]">
                  <Sparkles size={14} />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">
                  MEC Community
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#111827] sm:text-4xl">
                Family, in motion.
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#5F6673]">
                The place for everyday moments, stories, inside jokes,
                celebrations and everything happening across the family.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadPosts(true)}
              disabled={refreshing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DCD9D0] bg-[#FCFBF7] text-[#5F6673] shadow-[0_8px_30px_rgba(17,24,39,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#60A5FA]/50 hover:text-[#2563EB] disabled:opacity-50"
              aria-label="Refresh family feed"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>

          {!loading && posts.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#DCD9D0] bg-[#FCFBF7] px-3 py-1.5 text-[11px] font-medium text-[#5F6673]">
                {posts.length} {posts.length === 1 ? "moment" : "moments"}
              </span>

              {mediaCount > 0 && (
                <span className="rounded-full border border-[#DCD9D0] bg-[#FCFBF7] px-3 py-1.5 text-[11px] font-medium text-[#5F6673]">
                  {mediaCount} with media
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF0FF] px-3 py-1.5 text-[11px] font-semibold text-[#4F7CFF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4F7CFF]" />
                Family space
              </span>
            </div>
          )}
        </motion.header>

        {/* COMPOSER */}
        <motion.form
          onSubmit={handleCreatePost}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 overflow-hidden rounded-[26px] border border-[#DCD9D0] bg-[#FCFBF7] shadow-[0_18px_60px_rgba(17,24,39,0.07)]"
        >
          <div className="p-4 sm:p-5">
            <div className="flex gap-3">
              <div onClick={() => navigate(`/user/${post.author_id}`)} className="cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#60A5FA]/25 bg-[#DBEAFE] text-xs font-bold text-[#2563EB]">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "YOU"
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#111827]">
                    What's happening?
                  </p>

                  <span className="hidden text-[10px] font-medium text-[#8A8F98] sm:block">
                    Share with the family
                  </span>
                </div>

                <textarea
                  value={postText}
                  onChange={(event) =>
                    setPostText(event.target.value)
                  }
                  placeholder="Drop a thought, memory, photo or little life update..."
                  rows={3}
                  className="w-full resize-none bg-transparent py-2 text-sm leading-6 text-[#111827] outline-none placeholder:text-[#8A8F98]"
                />
              </div>
            </div>

            <AnimatePresence>
              {mediaPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative mt-3 overflow-hidden rounded-2xl border border-[#DCD9D0] bg-[#F1EFE8]"
                >
                  {selectedMedia?.type.startsWith("video") ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="max-h-[420px] w-full object-cover"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Selected media preview"
                      className="max-h-[420px] w-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={removeSelectedMedia}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/80 text-white shadow-lg backdrop-blur transition hover:bg-[#111827]"
                    aria-label="Remove selected media"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCD9D0] bg-[#F1EFE8]/45 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1">
              <label className="group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#5F6673] transition hover:bg-[#EAF0FF] hover:text-[#4F7CFF]">
                <ImageIcon size={16} />
                <span>Photo / video</span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </label>

              <span className="hidden text-[10px] text-[#8A8F98] sm:block">
                Up to 50 MB
              </span>
            </div>

            <motion.button
              type="submit"
              disabled={!postText.trim() && !selectedMedia}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(17,24,39,0.14)] transition hover:-translate-y-0.5 hover:bg-[#1B2435] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send size={14} />
              Share moment
            </motion.button>
          </div>
        </motion.form>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border border-[#E7B4AC] bg-[#FFF3F0] px-4 py-3 text-sm text-[#9B4036]"
          >
            {error}
          </motion.div>
        )}

        {/* FEED */}
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[26px] border border-[#DCD9D0] bg-[#FCFBF7]"
              >
                <div className="animate-pulse p-5">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[#F1EFE8]" />
                    <div className="space-y-2">
                      <div className="h-3 w-28 rounded-full bg-[#F1EFE8]" />
                      <div className="h-2 w-16 rounded-full bg-[#F1EFE8]" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="h-3 w-4/5 rounded-full bg-[#F1EFE8]" />
                    <div className="h-3 w-3/5 rounded-full bg-[#F1EFE8]" />
                  </div>

                  <div className="mt-5 h-64 rounded-2xl bg-[#F1EFE8]" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[30px] border border-[#DCD9D0] bg-[#FCFBF7] px-6 py-20 text-center shadow-[0_18px_60px_rgba(17,24,39,0.05)]"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#DBEAFE] text-[#2563EB]">
              <Users size={26} />
            </div>

            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#111827]">
              It's quiet in here.
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5F6673]">
              Be the person who starts the next family moment.
              Share a photo, thought, celebration or something
              completely random.
            </p>

            <button
              type="button"
              onClick={() =>
                document.querySelector("textarea")?.focus()
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5"
            >
              <Sparkles size={14} />
              Start the conversation
            </button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {posts.map((post, index) => {
              const profile = post.profiles
              const name = profile?.full_name || "MEC Member"
              const initials = getInitials(name)

              const liked = Boolean(userReactions[post.id])
              const likes = reactionCounts[post.id] ?? 0
              const totalComments =
                commentCounts[post.id] ?? 0
              const isCommentsOpen =
                Boolean(openComments[post.id])

              const isVideo =
                post.media_type?.startsWith("video")

              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.035, 0.2),
                    duration: 0.35,
                  }}
                  className="group overflow-hidden rounded-[26px] border border-[#DCD9D0] bg-[#FCFBF7] shadow-[0_12px_45px_rgba(17,24,39,0.055)] transition duration-300 hover:border-[#60A5FA]/30 hover:shadow-[0_18px_55px_rgba(17,24,39,0.085)]"
                >
                  {/* POST HEADER */}
                  <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#60A5FA]/20 bg-[#DBEAFE] text-xs font-bold text-[#2563EB]">
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
                        <div className="flex items-center gap-2">
                          <p onClick={() => navigate(`/user/${post.author_id}`)} className="cursor-pointer hover:underline truncate text-sm font-semibold text-[#111827]">
                            {name}
                          </p>

                          {index === 0 && (
                            <span className="hidden rounded-full bg-[#EAF0FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4F7CFF] sm:inline-flex">
                              Recent
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[11px] text-[#8A8F98]">
                          {formatTime(post.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      

                      <button
                        type="button"
                        onClick={() =>
                          setPostMenuId(postMenuId === post.id ? null : post.id)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8A8F98] transition hover:bg-[#F1EFE8] hover:text-[#111827]"
                        aria-label="Post options"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {postMenuId === post.id && (
                        <div className="absolute right-4 top-14 z-50 w-40 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)]">
                          {user?.id === post.author_id && canEditPost(post) && (
                            <button
                              type="button"
                              onClick={() => {
                                startEditingPost(post)
                                setPostMenuId(null)
                              }}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              <Edit3 size={15} className="text-gray-500" />
                              Edit
                            </button>
                          )}
                          {user?.id === post.author_id && (
                            <button
                              type="button"
                              onClick={() => {
                                handleDeletePost(post.id)
                                setPostMenuId(null)
                              }}
                              className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50 ${
                                canEditPost(post) ? "border-t border-gray-100" : ""
                              }`}
                            >
                              <Trash2 size={15} className="text-red-500" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONTENT */}
                  {editingPostId === post.id ? (
                    <div className="px-4 pb-4 pt-4 sm:px-5">
                      <textarea
                        value={editingPostText}
                        onChange={(event) =>
                          setEditingPostText(event.target.value)
                        }
                        autoFocus
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-[#60A5FA]/40 bg-[#F7F5EF] px-4 py-3 text-[15px] leading-7 text-[#111827] outline-none transition focus:border-[#4F7CFF]/50 focus:bg-white"
                        placeholder="Edit your post..."
                      />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-[#8A8F98]">
                          Editable for 24 hours after posting.
                        </span>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingPost}
                            disabled={savingEdit}
                            className="rounded-xl px-3 py-2 text-xs font-semibold text-[#5F6673] transition hover:bg-[#F1EFE8] hover:text-[#111827] disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditPost(post.id)}
                            disabled={
                              savingEdit ||
                              !editingPostText.trim()
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1B2435] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingEdit ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Edit3 size={13} />
                            )}

                            {savingEdit
                              ? "Saving..."
                              : "Save changes"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    post.content && (
                      <div className="px-4 pb-4 pt-4 sm:px-5">
                        <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#303846]">
                          {post.content}
                        </p>
                      </div>
                    )
                  )}

                  {/* MEDIA */}
                  {post.media_display_url && (
                    <div className="relative overflow-hidden border-y border-[#DCD9D0] bg-[#F1EFE8]">
                      {isVideo ? (
                        <video
                          src={post.media_display_url}
                          controls
                          preload="metadata"
                          className="max-h-[680px] w-full object-contain"
                        />
                      ) : (
                        <img
                          src={post.media_display_url}
                          alt=""
                          loading="lazy"
                          className="max-h-[680px] w-full object-cover transition duration-700 group-hover:scale-[1.01]"
                        />
                      )}

                      {isVideo && (
                        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#111827]/75 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md">
                          <Zap size={11} />
                          Video
                        </div>
                      )}
                    </div>
                  )}

                  {/* SOCIAL META */}
                  {(likes > 0 || totalComments > 0) && (
                    <div className="flex items-center justify-between px-4 pt-3 sm:px-5">
                      <div className="flex items-center gap-2">
                        {likes > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8A8F98]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFF0F0] text-[#E15B65]">
                              <Heart
                                size={10}
                                fill="currentColor"
                              />
                            </span>
                            {likes}
                          </div>
                        )}
                      </div>

                      {totalComments > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleComments(post.id)
                          }
                          className="text-[11px] font-medium text-[#8A8F98] transition hover:text-[#4F7CFF]"
                        >
                          {totalComments}{" "}
                          {totalComments === 1
                            ? "comment"
                            : "comments"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="flex items-center gap-1 px-3 py-3 sm:px-4">
                    <motion.button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      disabled={likingPostId === post.id}
                      whileTap={{ scale: 0.94 }}
                      className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${
                        liked
                          ? "bg-[#FFF0F0] text-[#D94E5A]"
                          : "text-[#5F6673] hover:bg-[#F1EFE8] hover:text-[#111827]"
                      }`}
                    >
                      {likingPostId === post.id ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <motion.span
                          animate={
                            liked
                              ? {
                                  scale: [1, 1.25, 1],
                                }
                              : { scale: 1 }
                          }
                        >
                          <Heart
                            size={16}
                            fill={
                              liked
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </motion.span>
                      )}

                      <span>
                        {liked ? "Loved" : "Like"}
                      </span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleComments(post.id)
                      }
                      className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${
                        isCommentsOpen
                          ? "bg-[#EAF0FF] text-[#4F7CFF]"
                          : "text-[#5F6673] hover:bg-[#F1EFE8] hover:text-[#111827]"
                      }`}
                    >
                      <MessageCircle size={16} />
                      <span>
                        {isCommentsOpen
                          ? "Close"
                          : "Comment"}
                      </span>

                      {totalComments > 0 && (
                        <span className="text-[10px] opacity-60">
                          {totalComments}
                        </span>
                      )}
                    </button>

                    <div className="ml-auto hidden items-center gap-1.5 pr-2 text-[10px] text-[#B0B3B8] sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                      Family only
                    </div>
                  </div>

                  {/* COMMENTS */}
                  <AnimatePresence initial={false}>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                        }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                        }}
                        className="overflow-hidden border-t border-[#DCD9D0] bg-[#F7F5EF]"
                      >
                        <div className="max-h-96 space-y-3 overflow-y-auto p-4 sm:p-5">
                          {loadingCommentsPostId ===
                          post.id ? (
                            <div className="flex justify-center py-5 text-[#8A8F98]">
                              <Loader2
                                size={18}
                                className="animate-spin"
                              />
                            </div>
                          ) : (
                            <>
                              {(comments[post.id] ?? [])
                                .length === 0 ? (
                                <div className="py-5 text-center">
                                  <MessageCircle
                                    size={20}
                                    className="mx-auto text-[#B0B3B8]"
                                  />

                                  <p className="mt-2 text-xs font-medium text-[#5F6673]">
                                    Start the conversation.
                                  </p>

                                  <p className="mt-1 text-[11px] text-[#8A8F98]">
                                    Someone has to break the
                                    silence.
                                  </p>
                                </div>
                              ) : (
                                (
                                  comments[post.id] ?? []
                                ).map((comment) => {
                                  const commentProfile =
                                    comment.profiles

                                  const commentName =
                                    commentProfile?.full_name ||
                                    "MEC Member"

                                  const isEditingComment =
                                    editingCommentId === comment.id

                                  const isDeletingComment =
                                    deletingCommentId === comment.id

                                  return (
                                    <div
                                      key={comment.id}
                                      className="flex gap-3"
                                    >
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#DBEAFE] text-[9px] font-bold text-[#2563EB]">
                                        {commentProfile?.avatar_url ? (
                                          <img
                                            src={
                                              commentProfile.avatar_url
                                            }
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          getInitials(
                                            commentName
                                          )
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1 rounded-2xl border border-[#DCD9D0] bg-[#FCFBF7] px-3.5 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-[#111827]">
                                              {commentName}
                                            </p>

                                            <p className="mt-0.5 text-[9px] text-[#B0B3B8]">
                                              {formatTime(
                                                comment.created_at
                                              )}
                                            </p>
                                          </div>

                                          {user?.id === comment.author_id && (
                                            <div className="flex shrink-0 items-center gap-0.5">
                                              {canEditComment(comment) && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    startEditingComment(comment)
                                                  }
                                                  disabled={
                                                    isDeletingComment ||
                                                    savingCommentEdit
                                                  }
                                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A8F98] transition hover:bg-[#EAF0FF] hover:text-[#4F7CFF] disabled:opacity-40"
                                                  aria-label="Edit comment"
                                                  title="Edit comment"
                                                >
                                                  <Edit3 size={13} />
                                                </button>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteComment(comment)
                                                }
                                                disabled={
                                                  isDeletingComment ||
                                                  savingCommentEdit
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A8F98] transition hover:bg-[#FFF3F0] hover:text-[#B44B40] disabled:opacity-40"
                                                aria-label="Delete comment"
                                                title="Delete comment"
                                              >
                                                {isDeletingComment ? (
                                                  <Loader2
                                                    size={13}
                                                    className="animate-spin"
                                                  />
                                                ) : (
                                                  <Trash2 size={13} />
                                                )}
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {isEditingComment ? (
                                          <div className="mt-3">
                                            <textarea
                                              value={editingCommentText}
                                              onChange={(event) =>
                                                setEditingCommentText(
                                                  event.target.value
                                                )
                                              }
                                              autoFocus
                                              rows={3}
                                              className="w-full resize-none rounded-xl border border-[#60A5FA]/40 bg-[#F7F5EF] px-3 py-2.5 text-xs leading-5 text-[#111827] outline-none transition focus:border-[#4F7CFF]/50 focus:bg-white"
                                              placeholder="Edit your comment..."
                                            />

                                            <div className="mt-2 flex items-center justify-between gap-2">
                                              <span className="text-[9px] text-[#8A8F98]">
                                                Editable for 24 hours.
                                              </span>

                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={cancelEditingComment}
                                                  disabled={savingCommentEdit}
                                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[#5F6673] transition hover:bg-[#F1EFE8] hover:text-[#111827] disabled:opacity-40"
                                                >
                                                  Cancel
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleEditComment(comment)
                                                  }
                                                  disabled={
                                                    savingCommentEdit ||
                                                    !editingCommentText.trim()
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#1B2435] disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                  {savingCommentEdit ? (
                                                    <Loader2
                                                      size={11}
                                                      className="animate-spin"
                                                    />
                                                  ) : (
                                                    <Edit3 size={11} />
                                                  )}

                                                  {savingCommentEdit
                                                    ? "Saving..."
                                                    : "Save"}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#5F6673]">
                                            {comment.content}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </>
                          )}
                        </div>

                        <form
                          onSubmit={(event) =>
                            handleComment(
                              event,
                              post.id
                            )
                          }
                          className="flex gap-2 border-t border-[#DCD9D0] bg-[#FCFBF7] p-3 sm:p-4"
                        >
                          <input
                            type="text"
                            value={
                              commentInputs[post.id] ?? ""
                            }
                            onChange={(event) =>
                              setCommentInputs(
                                (current) => ({
                                  ...current,
                                  [post.id]:
                                    event.target.value,
                                })
                              )
                            }
                            placeholder="Say something..."
                            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#DCD9D0] bg-[#F7F5EF] px-3.5 text-xs text-[#111827] outline-none transition placeholder:text-[#8A8F98] focus:border-[#4F7CFF]/50 focus:bg-white"
                          />

                          <motion.button
                            type="submit"
                            disabled={
                              !(commentInputs[
                                post.id
                              ] ?? "").trim() ||
                              commentingPostId ===
                                post.id
                            }
                            whileTap={{ scale: 0.94 }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4F7CFF] text-white shadow-[0_8px_20px_rgba(79,124,255,0.2)] transition hover:bg-[#3E6BEF] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Send comment"
                          >
                            {commentingPostId ===
                            post.id ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Send size={16} />
                            )}
                          </motion.button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>
          <UserProfileModal
        userId={viewingProfileId}
        onClose={() => setViewingProfileId(null)}
      />
</div>
  )
}

      
export default Community// Deploy: Thu Sep 17 11:24:42 WAT 2026
