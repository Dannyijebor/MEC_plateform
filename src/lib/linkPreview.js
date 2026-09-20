import { supabase } from "./supabase"

const URL_RE = /(https?:\/\/[^\s<>"']+)/i

export function extractFirstUrl(text) {
  if (!text) return null
  const m = String(text).match(URL_RE)
  return m ? m[1] : null
}

export async function unfurlUrl(url) {
  if (!url) return null
  try {
    const { data, error } = await supabase.functions.invoke("swift-handler", {
      body: { url },
    })
    if (error) throw error
    if (!data || data.error) return null
    return data
  } catch (err) {
    console.warn("unfurl failed:", err)
    return null
  }
}
