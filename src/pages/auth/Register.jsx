import { useRef, useState } from "react"
import { Camera, Eye, EyeOff, UserPlus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import { CHILDREN, RELATIONSHIP_OPTIONS } from "../../data/familyTree"

const PARENT_OPTIONS = [
  ...CHILDREN.map((c) => ({ value: c.slug, label: c.name })),
  { value: "grandchild", label: "Grandchild of Mark & Catherine" },
]

function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const fileRef = useRef(null)

  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [birthday, setBirthday] = useState("")
  const [parentSlug, setParentSlug] = useState("")
  const [relationship, setRelationship] = useState("")
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all required fields.")
      return
    }
    if (!birthday) { setError("Please add your birthday."); return }
    if (!parentSlug) { setError("Please select your family connection."); return }
    if (!relationship) { setError("Please select your relationship."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }

    setLoading(true)
    const { data, error } = await signUp({
      fullName: fullName.trim(),
      username: username.trim() || undefined,
      email: email.trim(),
      password,
      birthday,
      parentSlug,
      relationshipType: relationship,
    })
    setLoading(false)

    if (error) {
      setError(error.message || "Unable to create your account.")
      return
    }

    if (data?.user?.id && avatarFile) {
      try {
        const ext = avatarFile.name.split(".").pop()
        const path = `${data.user.id}/avatar-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("profile-avatars")
          .upload(path, avatarFile, { upsert: true })
        if (!upErr) {
          const { data: pub } = supabase.storage
            .from("profile-avatars")
            .getPublicUrl(path)
          await supabase
            .from("profiles")
            .update({ avatar_url: pub.publicUrl })
            .eq("id", data.user.id)
        }
      } catch (e) {
        console.warn("Avatar upload failed:", e)
      }
    }

    if (data?.session) { navigate("/app", { replace: true }); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-white py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1E40AF]">
          <UserPlus size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-gray-900">
          Check your email
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
          We've sent a confirmation link to your email address.
        </p>
        <Link
          to="/login"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#1E40AF] px-4 text-sm font-semibold text-white"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 outline-none transition focus:border-[#1E40AF] focus:bg-white placeholder:text-gray-400"
  const labelCls = "mb-1.5 block text-xs font-medium text-gray-700"
  const selectCls =
    "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 outline-none transition focus:border-[#1E40AF] focus:bg-white"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Join the clan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect to your branch of the family
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Avatar */}
      <div className="flex justify-center pb-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#1E40AF]/30 bg-blue-50"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera size={22} className="text-[#1E40AF]" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleAvatar}
          className="hidden"
        />
      </div>

      <div>
        <label className={labelCls}>Full name *</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g., Danny Ijebor"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_.]/gi, ""))}
          placeholder="danny"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Birthday *</label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Who in the clan are you connected to? *</label>
        <select
          value={parentSlug}
          onChange={(e) => setParentSlug(e.target.value)}
          className={selectCls}
        >
          <option value="">Select a family member</option>
          {PARENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Relationship *</label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className={selectCls}
        >
          <option value="">Select</option>
          {RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Password *</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls + " pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className={labelCls}>Confirm password *</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#1E40AF] text-sm font-semibold text-white transition hover:bg-[#1E40AF]/90 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create my account"}
      </button>

      <p className="pb-2 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[#1E40AF]">
          Sign in
        </Link>
      </p>
    </form>
  )
}

export default Register
