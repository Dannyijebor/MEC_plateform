import { useState } from "react"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"

function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.")
      return
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }

    setLoading(true)

    const { data, error } = await signUp({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message || "Unable to create your account.")
      return
    }

    if (data?.session) {
      navigate("/app", { replace: true })
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="py-4 text-center sm:py-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6]">
          <UserPlus size={24} />
        </div>

        <h2 className="mt-5 text-2xl font-semibold text-[#f7f3ea]">
          Check your email
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#f7f3ea]/45">
          We've sent a confirmation link to your email address.
          Confirm your account before signing in.
        </p>

        <Link
          to="/login"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#e4c982]"
        >
          Return to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#3B82F6]">
          Join the family
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f7f3ea] sm:text-3xl">
          Create your MEC account
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#f7f3ea]/45">
          Set up your private family community account.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-300/10 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-200/80"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-xs font-medium text-[#f7f3ea]/65"
          >
            Full name
          </label>

          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#3B82F6]/40 focus:bg-white/[0.05]"
          />
        </div>

        <div>
          <label
            htmlFor="registerEmail"
            className="mb-2 block text-xs font-medium text-[#f7f3ea]/65"
          >
            Email address
          </label>

          <input
            id="registerEmail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#3B82F6]/40 focus:bg-white/[0.05]"
          />
        </div>

        <div>
          <label
            htmlFor="registerPassword"
            className="mb-2 block text-xs font-medium text-[#f7f3ea]/65"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="registerPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 pr-12 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#3B82F6]/40 focus:bg-white/[0.05]"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[#f7f3ea]/35 transition hover:text-[#f7f3ea]/70"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-xs font-medium text-[#f7f3ea]/65"
          >
            Confirm password
          </label>

          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 pr-12 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#3B82F6]/40 focus:bg-white/[0.05]"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((value) => !value)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[#f7f3ea]/35 transition hover:text-[#f7f3ea]/70"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#e4c982] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            "Creating account..."
          ) : (
            <>
              <UserPlus size={17} />
              Create account
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />

        <span className="text-[10px] uppercase tracking-wider text-[#f7f3ea]/25">
          Already a member?
        </span>

        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <Link
        to="/login"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-[#f7f3ea]/70 transition hover:bg-white/[0.06] hover:text-[#f7f3ea]"
      >
        Sign in instead
      </Link>
    </div>
  )
}

export default Register
