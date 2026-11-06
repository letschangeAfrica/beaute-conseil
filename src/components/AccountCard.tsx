"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, RefreshCw, UserRound } from "lucide-react";
import { useSyncEnabled } from "@/lib/useLocal";
import { GoogleIcon } from "./GoogleIcon";
import { deleteAccountCopy } from "./SyncManager";
import { Skeleton } from "./ui";

export function Avatar({ src, name, size = 44 }: { src?: string | null; name?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full ring-2 ring-gold" />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-gold font-bold text-brand" style={{ width: size, height: size }}>
      {name?.[0]?.toUpperCase() ?? <UserRound size={size * 0.5} />}
    </span>
  );
}

/** Signed-in user with a sign-out button, or a "Continue with Google" call to action. */
export function AccountCard({ callbackUrl = "/profil" }: { callbackUrl?: string }) {
  const { data: session, status } = useSession();

  if (status === "loading") return <Skeleton className="h-24 w-full rounded-card" />;

  if (!session?.user) {
    return (
      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h3 className="font-display text-[1.15rem] leading-tight text-ink">Votre compte</h3>
          <p className="mt-0.5 text-sm text-ink/75">Connectez-vous pour retrouver votre profil sur tous vos appareils. Pas de compte ? Le même bouton le crée.</p>
        </div>
        <Link href={`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn bg-white text-ink ring-1 ring-ink/15 hover:bg-paper">
          <GoogleIcon size={18} aria-hidden="true" /> Continuer avec Google
        </Link>
      </section>
    );
  }

  const { name, email, image } = session.user;
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar src={image} name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{name ?? "Mon compte"}</p>
          {email && <p className="truncate text-sm text-ink/75">{email}</p>}
        </div>
        <button onClick={() => signOut({ redirectTo: "/" }).catch(() => (window.location.href = "/"))} className="btn-secondary min-w-12 px-3 py-2 text-sm" aria-label="Se déconnecter">
          <LogOut size={16} aria-hidden="true" /> <span className="hidden sm:inline">Se déconnecter</span>
        </button>
      </div>
      <SyncToggle />
    </section>
  );
}

/** Opt-in switch for keeping the profile and favourites in the account (explicit consent: health data). */
function SyncToggle() {
  const [enabled, setEnabled, ready] = useSyncEnabled();
  const [busy, setBusy] = useState(false);
  if (!ready) return null;

  async function change(on: boolean) {
    if (on) return setEnabled(true);
    if (!window.confirm("Arrêter la synchronisation et effacer la copie de votre profil enregistrée dans votre compte ? Il restera sur ce téléphone.")) return;
    setBusy(true);
    await deleteAccountCopy();
    setEnabled(false);
    setBusy(false);
  }

  return (
    <label className="flex cursor-pointer items-start gap-3 border-t border-line bg-paper/60 p-4 sm:px-5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/60 text-brand">
        <RefreshCw size={18} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">Retrouver mon profil sur tous mes appareils</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink/75">
          {enabled
            ? "Activé : votre profil (dont vos allergies) et vos favoris sont enregistrés dans votre compte."
            : "En activant, vous acceptez que votre profil, dont vos allergies et l'état de votre peau, et vos favoris soient enregistrés dans votre compte. Vous pouvez arrêter quand vous voulez."}{" "}
          <Link href="/confidentialite" className="font-semibold text-brand underline">
            En savoir plus
          </Link>
        </span>
      </span>
      <span className="relative mt-1 inline-flex">
        <input type="checkbox" role="switch" aria-checked={enabled} className="peer sr-only" checked={enabled} disabled={busy} onChange={(e) => change(e.target.checked)} />
        <span aria-hidden="true" className="h-7 w-12 rounded-full bg-ink/25 transition peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
