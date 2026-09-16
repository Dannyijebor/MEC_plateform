import { useState } from "react"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"

function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    if (!email.trim() || !password) {
      setError("Please enter your email and password.")
      return
    }

    setLoading(true)

    const { error } = await signIn({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message || "Unable to sign in.")
      return
    }

    navigate("/app", { replace: true })
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d9b86c]">
          Welcome back
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f7f3ea] sm:text-3xl">
          Sign in to MEC
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#f7f3ea]/45">
          Enter your details to continue to the family community.
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
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium text-[#f7f3ea]/65"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#d9b86c]/40 focus:bg-white/[0.05]"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[#f7f3ea]/65"
            >
              Password
            </label>

            <button
              type="button"
              className="text-[11px] text-[#d9b86c] transition hover:text-[#e4c982]"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 pr-12 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#f7f3ea]/25 focus:border-[#d9b86c]/40 focus:bg-white/[0.05]"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[#f7f3ea]/35 transition hover:text-[#f7f3ea]/70"
            >
              {showPassword ? (
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d9b86c] px-4 text-sm font-semibold text-[#17130a] transition hover:bg-[#e4c982] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              <LogIn size={17} />
              Sign in
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-[10px] uppercase tracking-wider text-[#f7f3ea]/25">
          New to MEC?
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <Link
        to="/register"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-[#f7f3ea]/70 transition hover:bg-white/[0.06] hover:text-[#f7f3ea]"
      >
        Create an account
      </Link>
    </div>
  )
}

export default Login
