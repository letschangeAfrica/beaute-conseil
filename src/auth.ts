import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (next-auth v5). Google is the only provider for now, so "sign in" and
 * "sign up" are the same flow: the first Google sign-in creates the account.
 * No database: the session lives in an encrypted cookie (JWT).
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (see .env.example).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/connexion", error: "/connexion" },
  trustHost: true,
});

/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeRedirect(path: string | string[] | undefined, fallback = "/profil"): string {
  const p = Array.isArray(path) ? path[0] : path;
  return p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") ? p : fallback;
}
