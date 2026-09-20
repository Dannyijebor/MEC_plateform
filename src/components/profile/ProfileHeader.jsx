import {
  Camera,
  CheckCircle2,
  CalendarDays,
  MapPin,
  Cake,
  Loader2,
} from "lucide-react"
import { CHILDREN, RELATIONSHIP_OPTIONS } from "../../data/familyTree"

function getInitials(name) {
  if (!name) return "M"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function formatJoined(date) {
  if (!date) return ""
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function formatMonthYear(date) {
  if (!date) return ""
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function familyMemberName(slug) {
  if (!slug) return ""
  const c = CHILDREN.find((x) => x.slug === slug)
  return c?.name || ""
}

function relationshipLabel(value) {
  if (!value) return ""
  const r = RELATIONSHIP_OPTIONS.find((x) => x.value === value)
  return r?.label || ""
}

export default function ProfileHeader({
  profile,
  displayName,
  editable = false,
  onBannerClick,
  onAvatarClick,
  uploadingBanner = false,
  uploadingAvatar = false,
  followCounts,
  actions,
}) {
  const name = displayName || profile?.full_name || profile?.username || "MEC Member"
  const initials = getInitials(name)
  const relName = familyMemberName(profile?.related_to_slug)
  const relLabel = relationshipLabel(profile?.relationship_type)

  return (
    <>
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[#F1E7CC] to-[#D9B86C] sm:h-52 lg:h-60">
        {profile?.banner_url ? (
          <img
            src={profile.banner_url}
            alt="Profile banner"
            className="h-full w-full object-cover"
          />
        ) : null}

        {editable && (
          <button
            type="button"
            onClick={onBannerClick}
            disabled={uploadingBanner}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-white/40 bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-60"
          >
            {uploadingBanner ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Camera size={14} />{" "}
                {profile?.banner_url ? "Change" : "Add banner"}
              </>
            )}
          </button>
        )}
      </div>

      <div className="relative px-4 sm:px-6">
        <div className="-mt-14 mb-3 flex items-end justify-between sm:-mt-16">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#F1E7CC] text-3xl font-bold text-[#A8873F] shadow-md sm:h-32 sm:w-32">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {editable && (
              <button
                type="button"
                onClick={onAvatarClick}
                disabled={uploadingAvatar}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-gray-900 text-white shadow-md transition hover:scale-105 disabled:opacity-60"
              >
                {uploadingAvatar ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
              </button>
            )}
          </div>

          {actions ? (
            <div className="flex items-center gap-2 pb-1">{actions}</div>
          ) : null}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-gray-900">
            {name}
          </h1>
          {profile?.verified && (
            <CheckCircle2
              size={20}
              className="text-[#1E40AF]"
              fill="currentColor"
              stroke="white"
            />
          )}
        </div>

        {profile?.username && (
          <p className="mt-0.5 text-sm text-gray-500">@{profile.username}</p>
        )}

        {profile?.bio && (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-gray-800">
            {profile.bio}
          </p>
        )}

        {relName && relLabel && (
          <p className="mt-2 text-sm text-gray-500">
            {relLabel} of {relName}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
          {profile?.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {profile.location}
            </span>
          )}
          {profile?.date_of_birth && (
            <span className="flex items-center gap-1.5">
              <Cake size={14} /> Born {formatMonthYear(profile.date_of_birth)}
            </span>
          )}
          {profile?.created_at && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> Joined {formatJoined(profile.created_at)}
            </span>
          )}
        </div>

        {followCounts && (
          <div className="mt-4 flex items-center gap-5 text-sm">
            <span>
              <strong className="font-bold text-gray-900">
                {followCounts.following}
              </strong>{" "}
              <span className="text-gray-500">Following</span>
            </span>
            <span>
              <strong className="font-bold text-gray-900">
                {followCounts.followers}
              </strong>{" "}
              <span className="text-gray-500">Followers</span>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
