export default function PageLoader({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-[#1E40AF]/20" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#1E40AF] text-white shadow-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  )
}
