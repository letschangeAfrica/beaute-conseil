import { describe, expect, it } from "vitest";
import { authCallbacks } from "./authCallbacks";

/* The callbacks receive large Auth.js objects; the tests pass only the fields the rules read. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (fn: any, arg: unknown) => fn(arg);

describe("sign-in rules (audit M-8)", () => {
  it("accepts a Google account with a verified address", () => {
    expect(call(authCallbacks.signIn, { account: { provider: "google" }, profile: { email_verified: true } })).toBe(true);
  });

  it("refuses an unverified address, a missing flag, or another provider", () => {
    expect(call(authCallbacks.signIn, { account: { provider: "google" }, profile: { email_verified: false } })).toBe(false);
    expect(call(authCallbacks.signIn, { account: { provider: "google" }, profile: {} })).toBe(false);
    expect(call(authCallbacks.signIn, { account: { provider: "github" }, profile: { email_verified: true } })).toBe(false);
  });

  it("uses the stable Google account id as identity, not a random per-sign-in id", () => {
    const token = call(authCallbacks.jwt, { token: { sub: "random-uuid", email: "a@b.c" }, account: { provider: "google", providerAccountId: "1234567890" } });
    expect(token.sub).toBe("google:1234567890");
  });

  it("keeps the identity on later requests (no account object then)", () => {
    expect(call(authCallbacks.jwt, { token: { sub: "google:1234567890" } }).sub).toBe("google:1234567890");
  });

  it("exposes the id on the session only when it is a Google account id", () => {
    expect(call(authCallbacks.session, { session: { user: {} }, token: { sub: "google:42" } }).user.id).toBe("google:42");
    expect(call(authCallbacks.session, { session: { user: {} }, token: { sub: "random-uuid" } }).user.id).toBeUndefined();
  });
});
