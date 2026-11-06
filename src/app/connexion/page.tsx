import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, safeRedirect, signIn } from "@/auth";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Logo, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Connexion · Belle" };

const ERRORS: Record<string, string> = {
  AccessDenied: "Connexion refusée. Réessayez avec un autre compte Google.",
  Configuration: "La connexion Google n'est pas encore configurée sur ce site.",
};

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(redirectTo);

  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorCode ? (ERRORS[errorCode] ?? "La connexion n'a pas abouti. Réessayez.") : null;

  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-6">
      <div>
        <Logo />
        <h1 className="mt-6 font-display text-[2rem] leading-tight text-ink">Bienvenue</h1>
        <p className="mt-2 text-ink/70">
          Connectez-vous pour retrouver votre espace beauté. Pas encore de compte ? Le même bouton le crée en un clic.
        </p>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button className="btn w-full bg-white py-3.5 text-ink shadow-soft ring-1 ring-ink/15 hover:bg-paper">
          <GoogleIcon /> Continuer avec Google
        </button>
      </form>

      <p className="text-center text-xs leading-relaxed text-ink/55">
        Nous recevons uniquement votre nom, votre e-mail et votre photo de profil Google. Votre profil beauté reste sur votre téléphone.{" "}
        <Link href="/confidentialite" className="underline">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
