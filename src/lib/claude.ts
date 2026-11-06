import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Reads ANTHROPIC_API_KEY from the environment (.env.local). */
export const anthropic = new Anthropic();

export const MODEL = "claude-opus-5-5";

/**
 * Server-side refusal fallback: if a safety classifier declines a request,
 * the API re-runs it on a suitable fallback model in the same call.
 */
export const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function profileSummary(p: unknown): string {
  return p ? `Profil beauté de l'utilisatrice (JSON) :\n${JSON.stringify(p)}` : "L'utilisatrice n'a pas encore rempli son profil.";
}
