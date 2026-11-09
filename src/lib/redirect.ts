/**
 * Post-login destinations: only paths on this site (audit M-1, CWE-601).
 *
 * Checking "starts with / but not //" is not enough: browsers strip tabs and newlines and turn "\" into "/",
 * so "/\t/evil.example" becomes "//evil.example", another site. We refuse any control character or
 * backslash, then let the URL parser decide: the result must stay on our own origin.
 */
const BASE = "https://belle.invalid";

const hasControlOrBackslash = (s: string) =>
  [...s].some((ch) => {
    const c = ch.charCodeAt(0);
    return c < 0x20 || c === 0x7f || ch === "\\";
  });

export function safeRedirect(path: string | string[] | undefined, fallback = "/profil"): string {
  const p = Array.isArray(path) ? path[0] : path;
  if (!p || !p.startsWith("/") || hasControlOrBackslash(p)) return fallback;
  try {
    const u = new URL(p, BASE);
    return u.origin === BASE ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
