"use client";
import { useState } from "react";
import { ExternalLink, Pipette } from "lucide-react";
import type { Profile } from "@/lib/types";
import { Notice, Spinner } from "./ui";

interface Match {
  found: boolean;
  shades: { name: string; why: string }[];
  tip: string;
  sourceUrl?: string;
}

/** Finds real shade names in a complexion product's range for her skin tone and undertone. */
export function ShadeFinder({ name, brand, code, profile }: { name: string; brand: string; code: string; profile: Profile }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");

  async function find() {
    setState("loading");
    try {
      const res = await fetch("/api/shade-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, brand, code, skinTone: profile.skinTone, undertone: profile.undertone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Une erreur est survenue.");
      setMatch(json);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setState("error");
    }
  }

  if (state === "done" && match) {
    if (!match.found) return <Notice>Nous n&apos;avons pas trouvé la gamme de teintes de ce produit. Demandez conseil en magasin et testez sur la mâchoire.</Notice>;
    return (
      <div className="space-y-2.5 rounded-2xl bg-paper p-4 ring-1 ring-caramel/30">
        <p className="flex items-center gap-2 text-sm font-bold text-brand">
          <Pipette size={17} /> Teintes à essayer en priorité
        </p>
        <ol className="space-y-2">
          {match.shades.map((s, i) => (
            <li key={s.name} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-cream">{i + 1}</span>
              <span>
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-sm text-ink/65">{s.why}</span>
              </span>
            </li>
          ))}
        </ol>
        {match.tip && <p className="text-sm text-ink/75">{match.tip}</p>}
        <p className="text-xs text-ink/50">
          Suggestion de l&apos;IA à partir de votre profil : testez toujours en magasin.
          {match.sourceUrl && (
            <>
              {" "}
              <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                Voir la gamme <ExternalLink size={12} />
              </a>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button className="btn-secondary w-full" onClick={find} disabled={state === "loading"}>
        {state === "loading" ? (
          <Spinner label="Recherche dans la gamme…" />
        ) : (
          <>
            <Pipette size={18} /> Trouver ma teinte dans cette gamme
          </>
        )}
      </button>
      {state === "loading" && <p className="text-center text-xs text-ink/50">Environ 20 secondes.</p>}
      {profile.undertone === "inconnu" && state === "idle" && (
        <p className="text-xs text-ink/55">Astuce : indiquez votre sous-ton dans votre profil (ou faites l&apos;analyse photo) pour un résultat plus précis.</p>
      )}
      {state === "error" && <Notice kind="error">{error}</Notice>}
    </div>
  );
}
