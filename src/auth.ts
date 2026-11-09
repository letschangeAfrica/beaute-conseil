import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authCallbacks } from "./lib/authCallbacks";

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
  callbacks: authCallbacks, // audit M-8: verified email only, stable Google account id as identity
});

/** Same-site post-login destinations only (audit M-1): see src/lib/redirect.ts. */
export { safeRedirect } from "./lib/redirect";
