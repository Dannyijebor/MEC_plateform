import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Cake,
  Calendar,
  Link as LinkIcon,
  Share2,
  Pencil,
  CheckCircle2,
  Heart,
  MessageCircle,
  Loader2,
  AtSign,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"
import { getOrCreateConversation } from "../../services/chat/chatService"

function initials(name = "MEC") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
}

function formatDate(date) {
  if (!date) return ""
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  } catch { return "" }
}

function formatJoined(date) {
  if (!date) return ""
  try {
    return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  } catch { return "" }
}

export default function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 })
  const [startingChat, setStartingChat] = useState(false)

  const isMe = me?.id === userId

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Load profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profErr) throw profErr
      setProfile(prof)

      // Load posts from last 24h
      const { data: feed } = await supabase
        .from("posts")
        .select(`
          id, content, media_url, media_type, created_at,
          profiles:author_id ( full_name, username, avatar_url )
        `)
        .eq("author_id", userId)
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(30)

      setPosts(feed || [])

      // Follow counts
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)

      setFollowCounts({
        followers: followersCount || 0,
        following: followingCount || 0,
      })

      // Am I following them?
      if (me?.id && me.id !== userId) {
        const { data: existing } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", me.id)
          .eq("following_id", userId)
          .maybeSingle()
        setFollowing(Boolean(existing))
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }, [userId, me?.id])

  useEffect(() => {
    load()
  }, [load])

  const handleFollow = async () => {
    if (!me?.id || isMe) return
    try {
      if (following) {
        await supabase.from("follows").delete()
          .eq("follower_id", me.id)
          .eq("following_id", userId)
        setFollowing(false)
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }))
      } else {
        await supabase.from("follows").insert({
          follower_id: me.id,
          following_id: userId,
        })
        setFollowing(true)
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }))
      }
    } catch (err) {
      console.warn("Follow action failed:", err)
    }
  }

  const handleMessage = async () => {
    if (!me?.id || isMe) return
    setStartingChat(true)
    try {
      const convId = await getOrCreateConversation(me.id, userId)
      navigate(`/messages?conversation=${convId}`)
    } catch (err) {
      console.warn("Could not start chat:", err)
    } finally {
      setStartingChat(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-[#A8873F]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <p className="text-sm text-gray-500">Profile not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    )
  }

  const name = profile.full_name || profile.username || "MEC Member"
  const cover = profile.cover_url

  return (
    <div data-user-profile className="min-h-screen bg-white pb-24 text-gray-900">
      {/* ─── HEADER BAR ─── */}
      <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{name}</p>
          <p className="truncate text-xs text-gray-500">{posts.length} post{posts.length === 1 ? "" : "s"} · last 24h</p>
        </div>
      </div>

      {/* ─── COVER ─── */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[#F1E7CC] to-[#D9B86C] sm:h-52">
        {cover && (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* ─── AVATAR + ACTIONS ─── */}
      <div className="relative px-4 sm:px-6">
        <div className="-mt-14 mb-3 flex items-end justify-between sm:-mt-16">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#F1E7CC] text-3xl font-bold text-[#A8873F] shadow-md sm:h-32 sm:w-32">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>

          <div className="flex items-center gap-2 pb-1">
            {isMe ? (
              <Link
                to="/profile"
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Edit profile
              </Link>
            ) : (
              <>
                <button
                  onClick={handleMessage}
                  disabled={startingChat}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 transition hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Message"
                >
                  {startingChat ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                </button>
                <button
                  onClick={handleFollow}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    following
                      ? "border border-gray-300 text-gray-900 hover:bg-gray-50"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── IDENTITY ─── */}
      <div className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-gray-900">{name}</h1>
          {profile.verified && (
            <CheckCircle2 size={20} className="text-[#1E40AF]" fill="currentColor" stroke="white" />
          )}
        </div>
        {profile.username && (
          <p className="mt-0.5 text-sm text-gray-500">@{profile.username}</p>
        )}

        {profile.bio && (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-gray-800">
            {profile.bio}
          </p>
        )}

        {/* Meta rows */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
          {profile.occupation && (
            <span className="flex items-center gap-1.5">
              <Briefcase size={14} />
              {profile.occupation}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {profile.location}
            </span>
          )}
          {profile.birthday && (
            <span className="flex items-center gap-1.5">
              <Cake size={14} />
              Born {formatDate(profile.birthday)}
            </span>
          )}
          {profile.created_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Joined {formatJoined(profile.created_at)}
            </span>
          )}
        </div>

        {/* Links */}
        {(profile.website || profile.instagram || profile.linkedin) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#1E40AF] hover:underline">
                <LinkIcon size={14} />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#1E40AF] hover:underline">
                <AtSign size={14} />
                {profile.instagram}
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-5 text-sm">
          <span>
            <strong className="font-bold text-gray-900">{followCounts.following}</strong>{" "}
            <span className="text-gray-500">Following</span>
          </span>
          <span>
            <strong className="font-bold text-gray-900">{followCounts.followers}</strong>{" "}
            <span className="text-gray-500">Followers</span>
          </span>
        </div>

        {/* Share button (full width) */}
        <div className="mt-4 flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            <Share2 size={15} />
            Share
          </button>
          {isMe && (
            <Link
              to="/profile"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <Pencil size={14} />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="mt-6 flex items-center border-b border-gray-100">
        <div className="relative px-4 py-3 text-sm font-bold text-gray-900">
          Posts
          <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gray-900" />
        </div>
      </div>

      {/* ─── POSTS FEED (last 24h only) ─── */}
      <div className="px-4 pb-4 pt-3 sm:px-6">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Heart size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No posts in the last 24 hours</p>
            <p className="mt-1 text-xs text-gray-400">
              {isMe ? "Share something to see it here." : `${name.split(" ")[0]} hasn't posted today.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#F1E7CC] text-xs font-bold text-[#A8873F]">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {post.content && (
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-gray-800">
                    {post.content}
                  </p>
                )}
                {post.media_url && post.media_type?.startsWith("image") && (
                  <img src={post.media_url} alt="" className="mt-3 max-h-96 w-full rounded-2xl object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
