"use client";
import { useFormStatus } from "react-dom";
import { GoogleIcon } from "./GoogleIcon";
import { Spinner } from "./ui";

/**
 * Submit button for the Google sign-in form (the server action stays on the page).
 * Follows Google's light button style: white, neutral border, dark text, the unmodified "G".
 */
export function GoogleSignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-[1.02rem] font-semibold text-[#1f1f1f] shadow-soft ring-1 ring-[#747775] transition hover:bg-[#f8f9fa] hover:shadow-lift active:scale-[0.99] disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      {pending ? (
        <Spinner label="Connexion…" />
      ) : (
        <>
          <GoogleIcon size={20} />
          Continuer avec Google
        </>
      )}
    </button>
  );
}
