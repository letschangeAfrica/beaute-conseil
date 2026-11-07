import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { auth, safeRedirect, signIn } from "@/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Logo, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Connexion · Belle" };

const ERRORS: Record<string, string> = {
  AccessDenied: "Connexion refusée. Réessayez avec un autre compte Google.",
  Configuration: "La connexion Google n'est pas encore configurée sur ce site.",
};

/** The only things an account really adds. No numbers here: the limits live in src/lib/guard.ts. */
/** The six skin-tone swatch colours of ProfileFields' TONES (a client module, so not importable as values here). */
const TONE_COLORS = ["#f6e1d3", "#ecc9ae", "#d6a77f", "#b98057", "#8a5a3b", "#5a3622"];

const BENEFITS = [
  { Icon: Sparkles, title: "Plus d'utilisations des fonctions IA", text: "Conseils de Belle, prix en ligne, analyse photo, lecture d'étiquette et recherche de teinte." },
  { Icon: RefreshCw, title: "Votre profil sur tous vos appareils, si vous le voulez", text: "Si vous activez la synchronisation dans votre profil. Elle est désactivée par défaut." },
];

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(redirectTo);

  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorCode ? (ERRORS[errorCode] ?? "La connexion n'a pas abouti. Réessayez.") : null;
  // A way out that never leads back here.
  const skipTo = !params.callbackUrl || redirectTo.startsWith("/connexion") ? "/" : redirectTo;

  return (
    <div data-layout="wide" className="flex justify-center sm:min-h-[calc(100dvh-10rem)] sm:items-center lg:grid lg:grid-cols-2 lg:gap-16">
      {/* Brand panel (desktop only, decorative): the same burgundy moment as the welcome intro. */}
      <div aria-hidden="true" className="relative hidden overflow-hidden rounded-panel bg-brand p-12 text-cream shadow-lift lg:flex lg:flex-col lg:justify-center lg:self-stretch">
        <span className="pointer-events-none absolute -right-8 -top-14 font-display text-[14rem] italic leading-none text-cream/[0.07]">B</span>
        <p className="eyebrow text-gold">Belle</p>
        <p className="mt-4 font-display text-[2.6rem] leading-[1.08]">
          Le bon produit,
          <br />
          <span className="italic text-gold">pour votre peau.</span>
        </p>
        <p className="mt-4 max-w-sm leading-relaxed text-cream/85">Un score sur 100 pour chaque produit, une alerte en cas d&apos;allergène, les prix comparés.</p>
        <div className="mt-10 flex gap-2">
          {TONE_COLORS.map((color) => (
            <span key={color} className="swatch h-9 w-9 ring-2 ring-brand" style={{ background: color }} />
          ))}
        </div>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-[28rem] motion-safe:animate-rise lg:justify-self-start">
        <Logo />
        <h1 className="mt-4 font-display text-headline sm:mt-6 font-normal text-ink">
          Votre compte <span className="italic text-brand">Belle</span>
        </h1>
        <p className="mt-2 leading-relaxed text-ink/75">
          Facultatif : Belle fonctionne sans compte. Pas encore de compte ? Le même bouton le crée.
        </p>

        <ul className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
          {BENEFITS.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon size={17} />
              </span>
              <span className="min-w-0 leading-snug">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="hidden text-sm text-ink/75 sm:block">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-5">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        <form
          className="mt-5 sm:mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <GoogleSignInButton />
        </form>

        <Link href={skipTo} className="mt-1 flex min-h-12 items-center justify-center gap-1.5 rounded-full font-semibold text-ink/75 hover:text-brand">
          Continuer sans compte <ArrowRight size={17} aria-hidden="true" />
        </Link>

        <div className="mt-2 flex gap-3 rounded-tile bg-paper p-3.5 text-sm sm:mt-4 sm:p-4 leading-relaxed text-ink/80 ring-1 ring-line">
          <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          <p>
            Google nous transmet uniquement votre nom, votre e-mail et votre photo. Votre profil beauté reste sur votre téléphone, sauf si vous activez la
            synchronisation.<span className="hidden sm:inline"> Vous pouvez tout supprimer à tout moment depuis votre profil.</span>{" "}
            <Link href="/confidentialite" className="font-semibold text-brand underline underline-offset-2">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
