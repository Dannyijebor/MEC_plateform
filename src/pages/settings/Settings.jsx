import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  User,
  Bell,
  Lock,
  Moon,
  Sun,
  MessageSquare,
  Phone,
  Mail,
  KeyRound,
  LogOut,
  ChevronRight,
  Smartphone,
  Eye,
  EyeOff,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { useTheme } from "../../context/ThemeContext"
import { supabase } from "../../lib/supabase"

function SettingRow({ icon: Icon, label, value, onClick, danger, right }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !right}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition ${
        onClick ? "hover:bg-gray-50" : ""
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger ? "bg-red-50 text-red-500" : "bg-blue-50 text-[#1E40AF]"
        }`}
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            danger ? "text-red-500" : "text-gray-900"
          }`}
        >
          {label}
        </p>
        {value && <p className="truncate text-xs text-gray-500">{value}</p>}
      </div>
      {right || (onClick && <ChevronRight size={16} className="text-gray-300" />)}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {title}
      </p>
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-1.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        value ? "bg-[#1E40AF]" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [pushEnabled, setPushEnabled] = useState(true)
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)
  const [showOnline, setShowOnline] = useState(true)

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <div data-settings-page className="min-h-screen bg-white pb-24 text-gray-900">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <p className="text-[11px] text-gray-500">Manage your account</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        <button
          onClick={() => navigate("/profile")}
          className="mb-5 flex w-full items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 text-left transition hover:bg-gray-50"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-lg font-bold text-[#1E40AF]">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.user_metadata?.full_name || user?.email || "M")
                .charAt(0)
                .toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {user?.user_metadata?.full_name || "MEC Member"}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        <Section title="Account">
          <SettingRow
            icon={User}
            label="Profile"
            value="Name, photo, bio"
            onClick={() => navigate("/profile")}
          />
          <SettingRow icon={Mail} label="Email" value={user?.email} onClick={() => {}} />
          <SettingRow
            icon={KeyRound}
            label="Change password"
            onClick={() => alert("Password reset link sent to your email")}
          />
        </Section>

        <Section title="Appearance">
          <SettingRow
            icon={theme === "dark" ? Moon : Sun}
            label="Dark mode"
            value={theme === "dark" ? "On" : "Off"}
            right={<Toggle value={theme === "dark"} onChange={toggleTheme} />}
          />
        </Section>

        <Section title="Notifications">
          <SettingRow
            icon={Bell}
            label="Push notifications"
            value="Messages & calls"
            right={<Toggle value={pushEnabled} onChange={setPushEnabled} />}
          />
          <SettingRow
            icon={MessageSquare}
            label="Message sounds"
            right={<Toggle value={soundsEnabled} onChange={setSoundsEnabled} />}
          />
        </Section>

        <Section title="Privacy">
          <SettingRow
            icon={Eye}
            label="Read receipts"
            value="Let others see when you read"
            right={<Toggle value={readReceipts} onChange={setReadReceipts} />}
          />
          <SettingRow
            icon={EyeOff}
            label="Show online status"
            right={<Toggle value={showOnline} onChange={setShowOnline} />}
          />
          <SettingRow icon={Lock} label="Blocked accounts" onClick={() => {}} />
        </Section>

        <Section title="Devices">
          <SettingRow
            icon={Smartphone}
            label="Active sessions"
            value="1 device signed in"
            onClick={() => {}}
          />
          <SettingRow icon={Phone} label="Linked devices" onClick={() => {}} />
        </Section>

        <Section title="Account actions">
          <SettingRow icon={LogOut} label="Sign out" danger onClick={signOut} />
        </Section>

        <p className="mt-8 text-center text-[11px] text-gray-400">
          MEC Platform · v1.0
        </p>
      </div>
    </div>
  )
}
