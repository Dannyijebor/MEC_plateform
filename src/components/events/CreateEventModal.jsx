import { useState } from "react"
import { X, MapPin, Loader2, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../hooks/useAuth"

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding", emoji: "💍" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "graduation", label: "Graduation", emoji: "🎓" },
  { value: "celebration", label: "Celebration", emoji: "🎊" },
  { value: "meeting", label: "Meeting", emoji: "📋" },
  { value: "other", label: "Other", emoji: "📌" },
]

export default function CreateEventModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("party")
  const [location, setLocation] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const reset = () => {
    setTitle(""); setDescription(""); setType("party")
    setLocation(""); setDate(""); setTime("")
    setError(""); setSaving(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!title.trim()) { setError("Please add a title."); return }
    if (!date) { setError("Please pick a date."); return }
    if (!user?.id) { setError("Please sign in again."); return }

    const isoDate = new Date(date + "T" + (time || "12:00")).toISOString()
    setSaving(true)
    try {
      const { data, error: insErr } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          type,
          location: location.trim() || null,
          event_date: isoDate,
          host_id: user.id,
          is_birthday: false,
        })
        .select()
        .single()
      if (insErr) throw insErr
      if (onCreated) onCreated(data)
      handleClose()
    } catch (err) {
      console.error(err)
      setError(err?.message || "Could not create event.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputCls = "h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#1E40AF] focus:bg-white"
  const labelCls = "mb-1.5 block text-xs font-medium text-gray-700"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-md sm:items-center sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl"
        >
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E40AF]">New event</p>
              <h2 className="mt-0.5 text-xl font-semibold text-gray-900">Create event</h2>
            </div>
            <button onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className={labelCls}>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mom's 60th Birthday" className={inputCls} autoFocus />
            </div>

            <div className="mb-4">
              <label className={labelCls}>Event type</label>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map((t) => {
                  const sel = type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={"flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition " + (sel ? "border-[#1E40AF] bg-blue-50" : "border-gray-200 bg-gray-50")}
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span className="text-[10px] font-semibold text-gray-700">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelCls}>Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Benin City" className={inputCls} />
            </div>

            <div className="mb-2">
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell the family what this is about..."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#1E40AF] focus:bg-white"
              />
            </div>
          </form>

          <div className="border-t border-gray-100 p-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? "Creating..." : "Create event"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
