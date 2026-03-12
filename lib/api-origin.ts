/**
 * Server-side: get Origin/Referer for upstream requests to back.bestys.co.
 * Reads from client header X-Platform-Origin; fallback for backwards compatibility.
 */
const DEFAULT_ORIGIN = "https://stemco.tech"

export function getRequestOrigin(req: Request): string {
  const raw = req.headers.get("x-platform-origin")?.trim()
  if (!raw) return DEFAULT_ORIGIN
  const normalized = raw.startsWith("http") ? raw : `https://${raw.replace(/\/$/, "")}`
  return normalized
}

export function originHeaders(origin: string): Record<string, string> {
  const o = origin.endsWith("/") ? origin.slice(0, -1) : origin
  return {
    Origin: o,
    Referer: `${o}/`,
  }
}
