"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, UserRound } from "lucide-react";
import { GoogleIcon } from "./GoogleIcon";
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

  if (status === "loading") return <Skeleton className="h-20 w-full rounded-2xl" />;

  if (!session?.user) {
    return (
      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="font-bold">Votre compte</h2>
          <p className="mt-0.5 text-sm text-ink/60">Connectez-vous ou créez un compte en un clic.</p>
        </div>
        <Link href={`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn bg-white text-ink ring-1 ring-ink/15 hover:bg-paper">
          <GoogleIcon size={18} /> Continuer avec Google
        </Link>
      </section>
    );
  }

  const { name, email, image } = session.user;
  return (
    <section className="card flex items-center gap-3 p-4">
      <Avatar src={image} name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{name ?? "Mon compte"}</p>
        {email && <p className="truncate text-sm text-ink/60">{email}</p>}
      </div>
      <button onClick={() => signOut({ redirectTo: "/" })} className="btn-secondary px-3 py-2 text-sm" aria-label="Se déconnecter">
        <LogOut size={16} /> <span className="hidden sm:inline">Se déconnecter</span>
      </button>
    </section>
  );
}
