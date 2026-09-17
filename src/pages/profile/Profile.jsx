import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Globe2,
  Heart,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Save,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

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

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const metadata = user?.user_metadata || {}

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    fullName: metadata.full_name || "",
    bio: metadata.bio || "",
    phone: metadata.phone || "",
    location: metadata.location || "",
    occupation: metadata.occupation || "",
    website: metadata.website || "",
    instagram: metadata.instagram || "",
    linkedin: metadata.linkedin || "",
    interests: metadata.interests || "",
  })

  useEffect(() => {
    const current = user?.user_metadata || {}

    setForm({
      fullName: current.full_name || "",
      bio: current.bio || "",
      phone: current.phone || "",
      location: current.location || "",
      occupation: current.occupation || "",
      website: current.website || "",
      instagram: current.instagram || "",
      linkedin: current.linkedin || "",
      interests: current.interests || "",
    })
  }, [user])

  const initials = useMemo(
    () => getInitials(form.fullName || metadata.full_name),
    [form.fullName, metadata.full_name]
  )

  const displayName =
    form.fullName || metadata.full_name || "MEC Member"

  const profileFields = [
    form.fullName,
    form.bio,
    form.phone,
    form.location,
    form.occupation,
  ]

  const completion = Math.min(
    100,
    Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100
    )
  )

  const interests = form.interests
    ? form.interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : []

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const startEditing = () => {
    setMessage("")
    setError("")
    setShowMore(false)
    setEditing(true)
  }

  const cancelEditing = () => {
    const current = user?.user_metadata || {}

    setForm({
      fullName: current.full_name || "",
      bio: current.bio || "",
      phone: current.phone || "",
      location: current.location || "",
      occupation: current.occupation || "",
      website: current.website || "",
      instagram: current.instagram || "",
      linkedin: current.linkedin || "",
      interests: current.interests || "",
    })

    setError("")
    setMessage("")
    setEditing(false)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    setError("")
    setMessage("")

    if (!form.fullName.trim()) {
      setError("Your full name is required.")
      return
    }

    setSaving(true)

    const { data, error: updateError } =
      await supabase.auth.updateUser({
        data: {
          full_name: form.fullName.trim(),
          bio: form.bio.trim(),
          phone: form.phone.trim(),
          location: form.location.trim(),
          occupation: form.occupation.trim(),
          website: form.website.trim(),
          instagram: form.instagram.trim(),
          linkedin: form.linkedin.trim(),
          interests: form.interests.trim(),
        },
      })

    setSaving(false)

    if (updateError) {
      setError(
        updateError.message || "Unable to update your profile."
      )
      return
    }

    if (data?.user) {
      setMessage("Profile updated successfully.")
    }

    setEditing(false)
  }

  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-6xl pb-32">
      {/* =========================================================
          PROFILE HERO
      ========================================================== */}
      <section className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#171b28] shadow-[0_20px_70px_rgba(32,38,53,0.12)]">
        {/* ambient lights */}
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#d9b86c]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-10 h-72 w-72 rounded-full bg-[#6575ff]/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(120deg,transparent,rgba(217,184,108,0.05))]" />

        <div className="relative px-5 pb-6 pt-6 sm:px-8 sm:pb-8">
          {/* top controls */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ea]/55">
              <Sparkles size={13} className="text-[#d9b86c]" />
              MEC identity
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/55 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="More profile options"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMore && (
                <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-2xl">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#202635] transition hover:bg-black/[0.04]"
                  >
                    <Pencil size={15} />
                    Edit profile
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#202635] transition hover:bg-black/[0.04]"
                  >
                    <Settings size={15} />
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* identity */}
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative shrink-0 self-center sm:self-auto">
              <div className="flex h-28 w-28 items-center justify-center rounded-[32px] border border-white/10 bg-gradient-to-br from-[#2d3448] to-[#111521] text-3xl font-bold text-[#d9b86c] shadow-2xl sm:h-32 sm:w-32 sm:text-4xl">
                {initials}
              </div>

              <button
                type="button"
                onClick={startEditing}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-[#171b28] bg-[#d9b86c] text-[#17130a] shadow-lg transition hover:scale-105"
                aria-label="Change profile photo"
              >
                <Camera size={16} />
              </button>

              <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#171b28] bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {displayName}
                </h1>

                <div className="flex h-6 items-center gap-1 rounded-full bg-[#d9b86c]/15 px-2.5 text-[10px] font-bold uppercase tracking-wide text-[#d9b86c]">
                  <Check size={11} />
                  Member
                </div>
              </div>

              <p className="mt-2 text-sm text-white/45">
                {form.occupation || "MEC family member"}
                {form.location ? ` · ${form.location}` : ""}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/55">
                  <Mail size={13} />
                  <span className="max-w-[220px] truncate">
                    {user.email}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </div>
              </div>
            </div>

            <div className="flex justify-center sm:justify-end">
              {!editing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#202635] transition hover:bg-[#f5f1e8]"
                >
                  <Edit3 size={16} />
                  Edit profile
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          QUICK STATS
      ========================================================== */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Users size={18} className="text-[#b99543]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#202635]/25">
              Family
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-[#202635]">MEC</p>
          <p className="mt-1 text-xs text-[#202635]/40">
            Community
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Zap size={18} className="text-[#b99543]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#202635]/25">
              Status
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-[#202635]">
            Active
          </p>
          <p className="mt-1 text-xs text-[#202635]/40">
            Member presence
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <CalendarDays size={18} className="text-[#b99543]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#202635]/25">
              Joined
            </span>
          </div>
          <p className="mt-4 text-lg font-bold text-[#202635]">
            {formatDate(user.created_at)}
          </p>
          <p className="mt-1 text-xs text-[#202635]/40">
            Member since
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Sparkles size={18} className="text-[#b99543]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#202635]/25">
              Profile
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-[#202635]">
            {completion}%
          </p>
          <p className="mt-1 text-xs text-[#202635]/40">
            Complete
          </p>
        </div>
      </div>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <form onSubmit={handleSave} className="mt-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            {/* About */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#b99543]">
                      <User size={17} />
                    </div>

                    <h2 className="font-semibold text-[#202635]">
                      About me
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-[#202635]/45">
                    Your introduction to the MEC community.
                  </p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#b99543] transition hover:bg-[#d9b86c]/10"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                )}
              </div>

              <div className="mt-6">
                {editing ? (
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    maxLength={500}
                    rows={5}
                    placeholder="Tell the MEC family about yourself..."
                    className="w-full resize-none rounded-2xl border border-black/[0.08] bg-[#faf8f3] px-4 py-3 text-sm leading-6 text-[#202635] outline-none transition placeholder:text-[#202635]/25 focus:border-[#b99543]/40 focus:ring-4 focus:ring-[#d9b86c]/10"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[#202635]/65">
                    {form.bio ||
                      "Your story starts here. Add a short introduction so other MEC members can get to know you."}
                  </p>
                )}
              </div>
            </section>

            {/* Personal details */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-[#202635]">
                    Personal details
                  </h2>
                  <p className="mt-1 text-sm text-[#202635]/45">
                    Information connected to your MEC identity.
                  </p>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#b99543] transition hover:bg-[#d9b86c]/10"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  icon={<User size={16} />}
                  label="Full name"
                  name="fullName"
                  value={form.fullName}
                  editing={editing}
                  onChange={handleChange}
                  placeholder="Your full name"
                />

                <Field
                  icon={<Mail size={16} />}
                  label="Email"
                  value={user.email || ""}
                  editing={false}
                  disabled
                />

                <Field
                  icon={<Phone size={16} />}
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  editing={editing}
                  onChange={handleChange}
                  placeholder="Phone number"
                />

                <Field
                  icon={<MapPin size={16} />}
                  label="Location"
                  name="location"
                  value={form.location}
                  editing={editing}
                  onChange={handleChange}
                  placeholder="City, country"
                />

                <Field
                  icon={<BriefcaseBusiness size={16} />}
                  label="Occupation"
                  name="occupation"
                  value={form.occupation}
                  editing={editing}
                  onChange={handleChange}
                  placeholder="What do you do?"
                />

                <Field
                  icon={<Globe2 size={16} />}
                  label="Website"
                  name="website"
                  value={form.website}
                  editing={editing}
                  onChange={handleChange}
                  placeholder="yourwebsite.com"
                />
              </div>
            </section>

            {/* Interests */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#b99543]">
                  <Heart size={17} />
                </div>

                <div>
                  <h2 className="font-semibold text-[#202635]">
                    Interests & passions
                  </h2>
                  <p className="mt-1 text-sm text-[#202635]/45">
                    Find common ground with your family.
                  </p>
                </div>
              </div>

              {editing ? (
                <div className="mt-5">
                  <input
                    name="interests"
                    value={form.interests}
                    onChange={handleChange}
                    placeholder="Music, technology, football, business..."
                    className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#faf8f3] px-4 text-sm text-[#202635] outline-none transition placeholder:text-[#202635]/25 focus:border-[#b99543]/40 focus:ring-4 focus:ring-[#d9b86c]/10"
                  />
                  <p className="mt-2 text-xs text-[#202635]/35">
                    Separate interests with commas.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {interests.length > 0 ? (
                    interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full border border-[#d9b86c]/20 bg-[#d9b86c]/10 px-3 py-1.5 text-xs font-medium text-[#8c6b26]"
                      >
                        {interest}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[#202635]/40">
                      Add your interests to connect with more members.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Social */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#b99543]">
                  <Link2 size={17} />
                </div>

                <div>
                  <h2 className="font-semibold text-[#202635]">
                    Social presence
                  </h2>
                  <p className="mt-1 text-sm text-[#202635]/45">
                    Let the family discover more of you.
                  </p>
                </div>
              </div>

              {editing ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field
                    icon={<Globe2 size={16} />}
                    label="Instagram"
                    name="instagram"
                    value={form.instagram}
                    editing
                    onChange={handleChange}
                    placeholder="@username"
                  />

                  <Field
                    icon={<Link2 size={16} />}
                    label="LinkedIn"
                    name="linkedin"
                    value={form.linkedin}
                    editing
                    onChange={handleChange}
                    placeholder="LinkedIn profile"
                  />
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  {form.instagram && (
                    <SocialButton
                      icon={<Globe2 size={16} />}
                      label={form.instagram}
                    />
                  )}

                  {form.linkedin && (
                    <SocialButton
                      icon={<Link2 size={16} />}
                      label={form.linkedin}
                    />
                  )}

                  {form.website && (
                    <SocialButton
                      icon={<Globe2 size={16} />}
                      label={form.website}
                    />
                  )}

                  {!form.instagram &&
                    !form.linkedin &&
                    !form.website && (
                      <p className="text-sm text-[#202635]/40">
                        Add your social links to make your profile more
                        discoverable.
                      </p>
                    )}
                </div>
              )}
            </section>
          </div>

          {/* =====================================================
              SIDEBAR
          ====================================================== */}
          <aside className="space-y-4">
            {/* Completion */}
            <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[#202635] p-5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9b86c]">
                    Profile health
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {completion === 100
                      ? "You're all set"
                      : "Complete your profile"}
                  </h3>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d9b86c]/30 bg-[#d9b86c]/10 text-sm font-bold text-[#d9b86c]">
                  {completion}%
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#d9b86c] transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-white/40">
                A complete profile helps your family recognize and connect
                with you.
              </p>

              {!editing && completion < 100 && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left text-xs font-semibold text-white/75 transition hover:bg-white/[0.08]"
                >
                  Complete profile
                  <ChevronRight size={15} />
                </button>
              )}
            </section>

            {/* Member identity */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9b86c]/10 text-[#b99543]">
                  <Shield size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#202635]">
                    Member identity
                  </h3>
                  <p className="text-xs text-[#202635]/40">
                    Secure MEC account
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <InfoRow
                  label="Status"
                  value="Active"
                  positive
                />

                <InfoRow
                  label="Joined"
                  value={formatDate(user.created_at)}
                />

                <InfoRow
                  label="Account"
                  value="Verified"
                />
              </div>
            </section>

            {/* Family */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#b99543]">
                    Your network
                  </p>
                  <h3 className="mt-1 font-semibold text-[#202635]">
                    MEC family
                  </h3>
                </div>

                <Users size={19} className="text-[#202635]/25" />
              </div>

              <p className="mt-4 text-sm leading-6 text-[#202635]/50">
                Your family connections, shared spaces and community
                activity will appear here as MEC grows.
              </p>

              <button
                type="button"
                onClick={() => navigate("/family-tree")}
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#faf8f3] px-4 py-3 text-xs font-semibold text-[#202635]/65 transition hover:bg-[#f1ede4]"
              >
                Explore family tree
                <ArrowUpRight size={15} />
              </button>
            </section>

            {/* Quick links */}
            <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#202635]/35">
                Quick access
              </p>

              <div className="mt-3 divide-y divide-black/[0.05]">
                <QuickLink
                  icon={<MessageCircle size={16} />}
                  label="Messages"
                  onClick={() => navigate("/messages")}
                />

                <QuickLink
                  icon={<Users size={16} />}
                  label="Community"
                  onClick={() => navigate("/community")}
                />

                <QuickLink
                  icon={<Bell size={16} />}
                  label="Notifications"
                />

                <QuickLink
                  icon={<Settings size={16} />}
                  label="Account settings"
                  onClick={() => navigate("/settings")}
                />
              </div>
            </section>
          </aside>
        </div>

        {/* Save bar */}
        {editing && (
          <div className="sticky bottom-4 z-40 mt-5 flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-[0_15px_50px_rgba(32,38,53,0.18)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9b86c]/15 text-[#b99543]">
                <Sparkles size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold text-[#202635]">
                  You're editing your profile
                </p>
                <p className="text-[11px] text-[#202635]/40">
                  Changes will be saved to your MEC account.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.08] px-4 text-xs font-semibold text-[#202635]/60 transition hover:bg-black/[0.03] disabled:opacity-50 sm:flex-none"
              >
                <X size={15} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#202635] px-5 text-xs font-semibold text-white transition hover:bg-[#2c3345] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Success/error messages */}
      {(message || error) && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  icon,
  label,
  name,
  value,
  editing,
  onChange,
  placeholder,
  disabled,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-[#202635]/55">
        {label}
      </label>

      {editing && !disabled ? (
        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#b99543]">
            {icon}
          </div>

          <input
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#faf8f3] pl-11 pr-4 text-sm text-[#202635] outline-none transition placeholder:text-[#202635]/25 focus:border-[#b99543]/40 focus:ring-4 focus:ring-[#d9b86c]/10"
          />
        </div>
      ) : (
        <div className="flex min-h-12 items-center gap-3 rounded-xl bg-[#faf8f3] px-4">
          <span className="shrink-0 text-[#b99543]">
            {icon}
          </span>

          <span className="truncate text-sm text-[#202635]/65">
            {value || "Not provided"}
          </span>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, positive }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-[#202635]/40">
        {label}
      </span>

      <span
        className={`text-xs font-semibold ${
          positive ? "text-emerald-600" : "text-[#202635]/65"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function SocialButton({ icon, label }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-xl border border-black/[0.07] bg-[#faf8f3] px-3.5 py-2.5 text-xs font-medium text-[#202635]/65 transition hover:border-[#d9b86c]/30 hover:bg-[#d9b86c]/5"
    >
      <span className="text-[#b99543]">{icon}</span>
      {label}
    </button>
  )
}

function QuickLink({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition hover:text-[#b99543]"
    >
      <span className="text-[#202635]/35">{icon}</span>
      <span className="flex-1 text-sm text-[#202635]/65">
        {label}
      </span>
      <ChevronRight size={14} className="text-[#202635]/20" />
    </button>
  )
}

export default Profile
