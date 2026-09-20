import { ExternalLink } from "lucide-react"

export default function LinkPreviewCard({ preview }) {
  if (!preview || !preview.url) return null

  const embed = preview.embed
  const hasImage = typeof preview.image === "string" && preview.image.length > 0
  const host = preview.siteName || (() => {
    try { return new URL(preview.url).hostname.replace(/^www\./, "") }
    catch { return "" }
  })()

  if (embed && embed.url) {
    return (
      <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-black/5">
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embed.url}
            title={preview.title || "Video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        {preview.title && (
          <div className="px-3 py-2">
            <p className="line-clamp-2 text-xs font-semibold text-gray-800">
              {preview.title}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-xl border border-black/10 bg-white/60 transition hover:bg-white/80"
    >
      {hasImage && (
        <div className="aspect-[2/1] w-full overflow-hidden bg-black/5">
          <img
            src={preview.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-xs font-semibold text-gray-800">
          {preview.title || host}
        </p>
        {preview.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
            {preview.description}
          </p>
        )}
        {host && (
          <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400">
            <ExternalLink size={10} />
            {host}
          </p>
        )}
      </div>
    </a>
  )
}
