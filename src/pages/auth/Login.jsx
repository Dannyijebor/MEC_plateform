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
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#3B82F6]">
          Welcome back
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#202635] sm:text-3xl">
          Sign in to MEC
        </h2>

        <p className="mt-2 text-sm leading-6 text-black/55">
          Enter your details to continue to the family community.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
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
            className="mb-2 block text-xs font-medium text-black/60"
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
            className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm text-[#202635] outline-none transition placeholder:text-black/30 focus:border-[#3B82F6]/40 focus:bg-white"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-medium text-black/60"
            >
              Password
            </label>

            <button
              type="button"
              className="text-[11px] text-[#3B82F6] transition hover:text-[#2563EB]"
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
              className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 pr-12 text-sm text-[#202635] outline-none transition placeholder:text-black/30 focus:border-[#3B82F6]/40 focus:bg-white"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-black/40 transition hover:text-black/65"
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="h-px flex-1 bg-black/[0.08]" />
        <span className="text-[10px] uppercase tracking-wider text-black/30">
          New to MEC?
        </span>
        <div className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <Link
        to="/register"
        className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-black/15 bg-white px-4 text-sm font-semibold text-[#202635] transition hover:border-black/25 hover:bg-black/[0.03] active:scale-[0.99]"
      >
        Create an account
      </Link>
    </div>
  )
}

export default Login
