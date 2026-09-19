import { useRef, useState } from "react"
import { Camera, Eye, EyeOff, UserPlus, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import { CHILDREN, RELATIONSHIP_OPTIONS } from "../../data/familyTree"

const PARENT_OPTIONS = [
  ...CHILDREN.map((c) => ({ value: c.slug, label: c.name })),
  { value: "grandchild", label: "Grandchild of Mark & Catherine" },
]

const STEPS = [
  { num: 1, label: "About you" },
  { num: 2, label: "Your clan" },
  { num: 3, label: "Account" },
]

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
}

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const fileRef = useRef(null)

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [birthday, setBirthday] = useState("")
  const [parentSlug, setParentSlug] = useState("")
  const [relationship, setRelationship] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
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

  const isStep1Valid = fullName.trim() && birthday
  const isStep2Valid = parentSlug && relationship
  const isStep3Valid =
    email.trim() &&
    password &&
    confirmPassword &&
    password.length >= 6 &&
    password === confirmPassword

  const canContinue =
    step === 1 ? isStep1Valid : step === 2 ? isStep2Valid : isStep3Valid

  const goNext = () => {
    setError("")
    if (!canContinue) return
    if (step < 3) {
      setDirection(1)
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const goBack = () => {
    setError("")
    if (step > 1) {
      setDirection(-1)
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setError("")
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
        const path = data.user.id + "/avatar-" + Date.now() + "." + ext
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
      } catch (err) {
        console.warn("Avatar upload failed:", err)
      }
    }

    if (data?.session) {
      navigate("/app", { replace: true })
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-white py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] text-[#3B82F6]">
          <UserPlus size={26} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-gray-900">
          Check your email
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
          We sent a confirmation link to your email address.
        </p>
        <Link
          to="/login"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl bg-[#3B82F6] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#2563EB]"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  const inputCls =
    "h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-[#3B82F6] focus:ring-4 focus:ring-[#EFF6FF]"
  const labelCls = "mb-2 block text-xs font-semibold text-gray-700"
  const selectCls =
    "h-12 w-full rounded-2xl border border-gray-100 bg-white px-4 text-[15px] text-gray-900 outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#EFF6FF] appearance-none"

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-gray-900">
          Join the clan
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Connect to your branch of the family
        </p>
      </div>

      {/* Compact progress */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s) => {
            const active = s.num === step
            const done = s.num < step
            return (
              <div
                key={s.num}
                className={
                  "rounded-full transition-all duration-500 ease-out " +
                  (active
                    ? "h-1.5 w-8 bg-[#3B82F6]"
                    : done
                      ? "h-1.5 w-1.5 bg-[#93C5FD]"
                      : "h-1.5 w-1.5 bg-gray-200")
                }
              />
            )
          })}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
          {STEPS[step - 1].label}
        </span>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-red-600">
            {error}
          </div>
        </motion.div>
      )}

      {/* Step content */}
      <div className="relative" style={{ minHeight: 380 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="space-y-5"
          >
            {/* ═════════ STEP 1 — ABOUT YOU ═════════ */}
            {step === 1 && (
              <>
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera size={20} className="text-[#3B82F6]" />
                        <span className="text-[10px] font-semibold text-[#3B82F6]">
                          Photo
                        </span>
                      </div>
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
                  <label className={labelCls}>Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Danny Ijebor"
                    className={inputCls}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}>Username <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-z0-9_.]/gi, ""))
                    }
                    placeholder="danny"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Birthday</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}

            {/* ═════════ STEP 2 — YOUR CLAN ═════════ */}
            {step === 2 && (
              <>
                <div className="rounded-2xl bg-[#EFF6FF] p-4">
                  <p className="text-xs leading-5 text-gray-600">
                    This helps us place you on the family tree.
                    You can always update this later.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Who are you connected to?</label>
                  <div className="relative">
                    <select
                      value={parentSlug}
                      onChange={(e) => setParentSlug(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Choose a family member</option>
                      {PARENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      ▾
                    </span>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Your relationship</label>
                  <div className="relative">
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Choose relationship</option>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      ▾
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ═════════ STEP 3 — ACCOUNT ═════════ */}
            {step === 3 && (
              <>
                <div>
                  <label className={labelCls}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls + " pr-12"}
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition hover:text-gray-500"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={
                      inputCls +
                      (password && confirmPassword && password !== confirmPassword
                        ? " border-red-200 focus:border-red-300 focus:ring-red-50"
                        : "")
                    }
                    placeholder="Repeat your password"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-500">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {step > 1 && (
          <motion.button
            type="button"
            onClick={goBack}
            disabled={loading}
            whileTap={{ scale: 0.95 }}
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            style={{ height: 52, width: 52 }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={goNext}
          disabled={!canContinue || loading}
          whileTap={{ scale: 0.98 }}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none"
          style={{ height: 52 }}
        >
          {loading ? (
            "Creating account..."
          ) : step === 3 ? (
            <>
              <Check size={16} strokeWidth={3} />
              Create my account
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </div>

      <p className="pb-2 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#3B82F6] transition hover:text-[#2563EB]"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
