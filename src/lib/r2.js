import { supabase } from "./supabase"

export async function uploadToR2(file, folder = "chat") {
  if (!file) throw new Error("No file provided")

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const key = `${folder}/${stamp}-${rand}.${ext}`

  const { data, error } = await supabase.functions.invoke("rapid-action", {
    body: { key, contentType: file.type || "application/octet-stream" },
  })

  if (error) throw new Error(`rapid-action failed: ${error.message}`)
  if (!data?.uploadUrl) throw new Error("No upload URL returned")

  const res = await fetch(data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`R2 upload failed: ${res.status} ${text.slice(0, 200)}`)
  }

  return {
    url: data.publicUrl,
    key: data.key,
    type: file.type,
    size: file.size,
  }
}
