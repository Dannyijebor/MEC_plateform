import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Globe2,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import { CHILDREN, RELATIONSHIP_OPTIONS } from "../../data/familyTree"
import ProfileHeader from "../../components/profile/ProfileHeader"
import FollowListModal from "../../components/profile/FollowListModal"

function getInitials(name) {
  if (!name) return "M"

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatDate(date) {
  if (!date) return "Recently"

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return "Recently"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 })
  const [followModal, setFollowModal] = useState(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) return

    let mounted = true

    async function loadProfile() {
      setLoading(true)
      setError("")

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          banner_url,
          date_of_birth,
          related_to_slug,
          relationship_type,
          bio,
          phone,
          location,
          role,
          is_active,
          created_at,
          updated_at
        `)
        .eq("id", user.id)
        .maybeSingle()

      if (!mounted) return

      if (profileError) {
        console.error("Unable to load profile:", profileError)
        setError(
          profileError.message || "Unable to load your profile."
        )
        setLoading(false)
        return
      }

      if (!data) {
        setError(
          "Your MEC profile could not be found. Please sign out and sign in again."
        )
        setLoading(false)
        return
      }

      setProfile(data)
      setForm({
        fullName: data.full_name || "",
        username: data.username || "",
        bio: data.bio || "",
        phone: data.phone || "",
        location: data.location || "",
        dateOfBirth: data.date_of_birth || "",
        relatedToSlug: data.related_to_slug || "",
        relationshipType: data.relationship_type || "",
      })

      setLoading(false)
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadFollowCounts() {
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)
      if (cancelled) return
      setFollowCounts({
        followers: followersCount || 0,
        following: followingCount || 0,
      })
    }
    loadFollowCounts()
    return () => { cancelled = true }
  }, [user])

  const displayName =
    form?.fullName?.trim() ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "MEC Member"

  const initials = useMemo(
    () => getInitials(displayName),
    [displayName]
  )

  const completionFields = [
    profile?.full_name,
    profile?.username,
    profile?.avatar_url,
    profile?.bio,
    profile?.phone,
    profile?.location,
  ]

  const completion = Math.round(
    (completionFields.filter(Boolean).length /
      completionFields.length) *
      100
  )

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Member"

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const startEditing = () => {
    setError("")
    setMessage("")
    setEditing(true)
  }

  const cancelEditing = () => {
    setForm({
      fullName: profile?.full_name || "",
      username: profile?.username || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      dateOfBirth: profile?.date_of_birth || "",
      relatedToSlug: profile?.related_to_slug || "",
      relationshipType: profile?.relationship_type || "",
    })

    setError("")
    setMessage("")
    setEditing(false)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!user || !form) return

    setError("")
    setMessage("")

    const fullName = form.fullName.trim()
    const username = form.username.trim().toLowerCase()

    if (!fullName) {
      setError("Your full name is required.")
      return
    }

    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      setError(
        "Username must be 3–30 characters and use only letters, numbers, dots, underscores, or hyphens."
      )
      return
    }

    setSaving(true)

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username || null,
        bio: form.bio.trim() || null,
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        date_of_birth: form.dateOfBirth || null,
        related_to_slug: form.relatedToSlug || null,
        relationship_type: form.relationshipType || null,
      })
      .eq("id", user.id)
      .select(`
        id,
        full_name,
        username,
        avatar_url,
        banner_url,
        date_of_birth,
        related_to_slug,
        relationship_type,
        bio,
        phone,
        location,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    setSaving(false)

    if (updateError) {
      if (
        updateError.code === "23505" ||
        updateError.message?.toLowerCase().includes("username")
      ) {
        setError("That username is already taken.")
      } else {
        setError(
          updateError.message || "Unable to update your profile."
        )
      }

      return
    }

    setProfile(data)
    setForm({
      fullName: data.full_name || "",
      username: data.username || "",
      bio: data.bio || "",
      phone: data.phone || "",
      location: data.location || "",
    })

    setEditing(false)
    setMessage("Profile updated successfully.")
  }

  const handleBannerClick = () => {
    bannerInputRef.current?.click()
  }

  const handleBannerChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !user) return

    setError("")
    setMessage("")

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a JPG, PNG, WebP, or GIF image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Banner images must be smaller than 5 MB.")
      return
    }

    setUploadingBanner(true)

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${user.id}/banner-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error("Banner upload failed:", uploadError)
      setUploadingBanner(false)
      setError(uploadError.message || "Unable to upload your banner.")
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(path)

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", user.id)
      .select(`id, full_name, username, avatar_url, banner_url, date_of_birth, related_to_slug, relationship_type, bio, phone, location, role, is_active, created_at, updated_at`)
      .single()

    setUploadingBanner(false)

    if (updateError) {
      setError(updateError.message || "Unable to save your banner.")
      return
    }

    setProfile(data)
    setMessage("Banner updated.")
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]

    event.target.value = ""

    if (!file || !user) return

    setError("")
    setMessage("")

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]

    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a JPG, PNG, WebP, or GIF image.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be smaller than 5 MB.")
      return
    }

    setUploadingAvatar(true)

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg"

    const path = `${user.id}/profile-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError)
      setUploadingAvatar(false)
      setError(
        uploadError.message || "Unable to upload your profile picture."
      )
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(path)

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
      })
      .eq("id", user.id)
      .select(`
        id,
        full_name,
        username,
        avatar_url,
        banner_url,
        date_of_birth,
        related_to_slug,
        relationship_type,
        bio,
        phone,
        location,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error("Unable to save avatar URL:", updateError)

      await supabase.storage
        .from("profile-avatars")
        .remove([path])

      setUploadingAvatar(false)
      setError(
        updateError.message ||
          "The picture uploaded but could not be attached to your profile."
      )
      return
    }

    setProfile(data)
    setUploadingAvatar(false)
    setMessage("Profile picture updated.")
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">
            Loading your profile…
          </span>
        </div>
      </div>
    )
  }

  if (!user || !profile || !form) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-900">
            {error || "Unable to load your profile."}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#202635] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-32">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleBannerChange}
      />

      <ProfileHeader
        profile={profile}
        displayName={displayName}
        editable={editing}
        onFollowersClick={() => setFollowModal("followers")}
        onFollowingClick={() => setFollowModal("following")}
        onBannerClick={handleBannerClick}
        onAvatarClick={handleAvatarClick}
        uploadingBanner={uploadingBanner}
        uploadingAvatar={uploadingAvatar}
        followCounts={followCounts}
        actions={
          <button
            onClick={editing ? cancelEditing : startEditing}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            {editing ? "Cancel" : "Edit profile"}
          </button>
        }
      />

      <FollowListModal
        open={followModal !== null}
        onClose={() => setFollowModal(null)}
        userId={user?.id}
        mode={followModal || "followers"}
      />

      {/* STATUS */}
      {(message || error) && (
        <div
          className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ? <X size={18} /> : <Check size={18} />}
          <span className="flex-1">{error || message}</span>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <main className="space-y-5">
          {editing ? (
            <form
              onSubmit={handleSave}
              className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#202635] p-2 text-white">
                    <User size={18} />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      Personal identity
                    </h2>
                    <p className="text-xs text-black/45">
                      Keep your MEC profile current.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Full name
                  </span>

                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Username
                  </span>

                  <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-[#fafafa] focus-within:border-black/30">
                    <span className="flex items-center pl-4 text-black/40">
                      @
                    </span>

                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="username"
                      className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-sm outline-none"
                    />
                  </div>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Phone
                  </span>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Location
                  </span>

                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="City or location"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Email
                  </span>

                  <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-black/[0.03] px-4 py-3.5">
                    <Mail size={17} className="text-black/40" />
                    <span className="truncate text-sm text-black/55">
                      {user.email}
                    </span>
                  </div>
                </div>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Date of birth
                  </span>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Family member
                  </span>
                  <select
                    name="relatedToSlug"
                    value={form.relatedToSlug}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  >
                    <option value="">Choose a family member</option>
                    {CHILDREN.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    Relationship
                  </span>
                  <select
                    name="relationshipType"
                    value={form.relationshipType}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                  >
                    <option value="">Choose relationship</option>
                    {RELATIONSHIP_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sm:col-span-2 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-black/45 mb-2">
                    Your connections
                  </p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="font-bold text-[#202635]">{followCounts.followers}</span>
                      <span className="ml-1.5 text-black/55">Followers</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#202635]">{followCounts.following}</span>
                      <span className="ml-1.5 text-black/55">Following</span>
                    </div>
                  </div>
                </div>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/45">
                    About you
                  </span>

                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    rows={5}
                    maxLength={500}
                    placeholder="Tell your MEC community a little about yourself…"
                    className="w-full resize-none rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm leading-6 outline-none transition focus:border-black/30 focus:bg-white"
                  />

                  <span className="mt-1 block text-right text-xs text-black/35">
                    {form.bio.length}/500
                  </span>
                </label>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-2xl border border-black/10 px-5 py-3 text-sm font-semibold transition hover:bg-black/[0.03]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#202635] px-5 py-3 text-sm font-bold text-white shadow-lg transition disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* ABOUT */}
              <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                      About
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      A little about me
                    </h2>
                  </div>

                  <button
                    onClick={startEditing}
                    className="rounded-xl p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                    aria-label="Edit about"
                  >
                    <Edit3 size={17} />
                  </button>
                </div>

                <p className="mt-5 text-sm leading-7 text-black/60">
                  {profile.bio ||
                    "You haven't added a bio yet. Tell the MEC community something about yourself."}
                </p>
              </section>

              {/* PERSONAL DETAILS */}
              <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                    Personal details
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Your information
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailCard
                    icon={<Mail size={17} />}
                    label="Email"
                    value={user.email}
                  />

                  <DetailCard
                    icon={<Phone size={17} />}
                    label="Phone"
                    value={profile.phone}
                  />

                  <DetailCard
                    icon={<MapPin size={17} />}
                    label="Location"
                    value={profile.location}
                  />

                  <DetailCard
                    icon={<ShieldCheck size={17} />}
                    label="Membership"
                    value={roleLabel}
                  />
                </div>
              </section>

              {/* IDENTITY */}
              <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-black/[0.04] p-3">
                    <Sparkles size={19} />
                  </div>

                  <div>
                    <h2 className="font-black">MEC identity</h2>
                    <p className="text-xs text-black/45">
                      Your place in the community.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <IdentityCard
                    label="Username"
                    value={
                      profile.username
                        ? `@${profile.username}`
                        : "Not set"
                    }
                  />

                  <IdentityCard
                    label="Status"
                    value={
                      profile.is_active
                        ? "Active member"
                        : "Inactive"
                    }
                  />

                  <IdentityCard
                    label="Role"
                    value={roleLabel}
                  />

                  <IdentityCard
                    label="Member since"
                    value={formatDate(profile.created_at)}
                  />
                </div>
              </section>
            </>
          )}
        </main>

        {/* RIGHT RAIL */}
        <aside className="space-y-5">
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                  Profile health
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {completion}% complete
                </h2>
              </div>

              <div className="rounded-xl bg-black/[0.04] p-2">
                <Zap size={18} />
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-[#202635] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-black/45">
              A complete profile makes it easier for people in your MEC
              community to recognize and connect with you.
            </p>

            {completion < 100 && (
              <button
                onClick={startEditing}
                className="mt-4 flex w-full items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 text-sm font-semibold transition hover:bg-black/[0.07]"
              >
                Complete profile
                <ChevronRight size={16} />
              </button>
            )}
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Quick access
            </p>

            <div className="mt-3 divide-y divide-black/5">
              <QuickAction
                icon={<Users size={18} />}
                title="Community"
                description="See what everyone is sharing"
                onClick={() => navigate("/community")}
              />

              <QuickAction
                icon={<MessageCircle size={18} />}
                title="Messages"
                description="Keep your conversations moving"
                onClick={() => navigate("/messages")}
              />

              <QuickAction
                icon={<Heart size={18} />}
                title="Spaces"
                description="Join live community spaces"
                onClick={() => navigate("/spaces")}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-black/[0.04] p-3">
                <Globe2 size={18} />
              </div>

              <div className="min-w-0">
                <h3 className="font-bold">
                  Your profile is live
                </h3>

                <p className="mt-1 text-xs leading-5 text-black/45">
                  Changes to your profile appear across the MEC
                  community.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-black/[0.035] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-black/55">
                <Check size={15} />
                Profile connected to your MEC account
              </div>
            </div>
          </section>
        </aside>
      </div>

      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#202635] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={17} />
                Save profile
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function DetailCard({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-black/[0.025] p-4">
      <div className="shrink-0 rounded-xl bg-white p-2.5 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-black/35">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-black/70">
          {value || "Not added yet"}
        </p>
      </div>
    </div>
  )
}

function IdentityCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-black/35">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}

function QuickAction({ icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 py-4 text-left transition hover:translate-x-0.5"
    >
      <div className="shrink-0 rounded-xl bg-black/[0.04] p-2.5">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>

        <p className="mt-0.5 truncate text-xs text-black/40">
          {description}
        </p>
      </div>

      <ChevronRight size={16} className="shrink-0 text-black/25" />
    </button>
  )
}

export default Profile
