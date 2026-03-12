/**
 * Platform options for login. Stored in localStorage as "platform" (host only).
 * When sending to API, use full origin: https://<host>
 */
export const PLATFORM_STORAGE_KEY = "platform"

export const PLATFORM_OPTIONS = [
  "stemco.tech",
  "app.eduverse.kz",
  "proctor.spiritofmathcontest.com",
  "test.zeeneducation.com",
  "app.abakacademy.id",
] as const

export type PlatformOption = (typeof PLATFORM_OPTIONS)[number]

/** Display config for platform cards (label, favicon URL) */
export const PLATFORM_CARD_OPTIONS: { value: string; label: string }[] = [
  { value: "stemco.tech", label: "Stemco" },
  { value: "app.eduverse.kz", label: "Eduverse" },
  { value: "proctor.spiritofmathcontest.com", label: "Spirit of Math" },
  { value: "test.zeeneducation.com", label: "Zeen Education" },
  { value: "app.abakacademy.id", label: "Abak Academy" },
]

/** Normalize stored value to full origin (https, no trailing slash) */
export function toOrigin(host: string): string {
  const trimmed = host.replace(/\/$/, "").trim()
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
}

const isBrowser = typeof window !== "undefined"

export function getStoredPlatform(): string {
  if (!isBrowser) return ""
  return localStorage.getItem(PLATFORM_STORAGE_KEY) ?? ""
}

export function setStoredPlatform(host: string): void {
  if (!isBrowser) return
  localStorage.setItem(PLATFORM_STORAGE_KEY, host.replace(/\/$/, "").trim())
}

export function clearStoredPlatform(): void {
  if (!isBrowser) return
  localStorage.removeItem(PLATFORM_STORAGE_KEY)
}

/** Header value for API requests: X-Platform-Origin */
export function getPlatformOriginHeader(): string {
  return toOrigin(getStoredPlatform())
}
