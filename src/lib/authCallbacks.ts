import type { NextAuthConfig } from "next-auth";

/**
 * Sign-in rules (audit M-8), kept apart from src/auth.ts so they can be unit-tested.
 *
 * Only Google accounts whose address Google has verified may sign in (otherwise "Connexion refusée").
 * Without a database, Auth.js gives each sign-in a random id, so the app used the email as identity:
 * data then belonged to "whoever has a Google login for that address". The account id Google issues is
 * stable and unique, so it becomes the identity: session.user.id = "google:<id>".
 */
export const authCallbacks: NonNullable<NextAuthConfig["callbacks"]> = {
  signIn: ({ account, profile }) => account?.provider === "google" && profile?.email_verified === true,
  jwt({ token, account }) {
    if (account?.provider === "google" && account.providerAccountId) token.sub = `google:${account.providerAccountId}`;
    return token;
  },
  session({ session, token }) {
    if (token.sub?.startsWith("google:")) session.user.id = token.sub;
    return session;
  },
};
