/**
 * Publisher details shown on /mentions-legales and /confidentialite.
 * ⚠️ Fill in every "[…]" value before publishing the app.
 *
 * If you publish as a private individual (non professionnel), French law (LCEN art. 6-III-2)
 * lets you show only a contact email and the host's details, as long as the host has your identity.
 * Set `individual: true` to hide the name and address lines in that case.
 */
export const LEGAL = {
  appName: "Belle",
  siteUrl: "[https://votre-domaine.fr]",
  individual: true,
  publisher: "[Prénom Nom ou raison sociale]",
  /** Only for companies: legal form, capital, RCS / SIRET. */
  company: "",
  address: "[Adresse postale]",
  email: "[contact@votre-domaine.fr]",
  publicationDirector: "[Prénom Nom]",
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    url: "https://vercel.com",
  },
  updated: "7 novembre 2026",
} as const;

/** Bump when the selfie processing changes, so people are asked again. */
export const SELFIE_CONSENT_VERSION = 1;
