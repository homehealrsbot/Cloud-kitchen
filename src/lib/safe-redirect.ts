// `next` يجي من الـ query string — لازم يتحقق منه قبل أي تحويل.
// The `next` query param is attacker-controllable, so only same-site absolute
// paths are allowed through; anything else falls back. This blocks open
// redirects via "//evil.com", "/\evil.com" and "https://evil.com".
// Kept in its own module so both client and server code can import it.
export function safeNextPath(raw: string | undefined | null, fallback = "/admin") {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
