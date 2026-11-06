"use client";
import { useState } from "react";
import { Camera } from "lucide-react";
import { resizeImage } from "@/lib/image";
import { Notice, Spinner } from "./ui";

export interface LabelReading {
  ingredientsText: string;
  productName: string;
  brand: string;
}

/** "Photograph the ingredient list" button: sends the photo to /api/ingredients and returns the transcription. */
export function IngredientPhoto({ onRead, label = "Photographier la liste d'ingrédients" }: { onRead: (r: LabelReading) => void; label?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function read(file: File) {
    setState("loading");
    setError("");
    try {
      // Larger than the selfie: ingredient lists are printed small.
      const { data, mediaType } = await resizeImage(file, 1800);
      const res = await fetch("/api/ingredients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: data, mediaType }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Une erreur est survenue.");
      setState("idle");
      onRead(json as LabelReading);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <label className={`btn-primary w-full cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${state === "loading" ? "pointer-events-none opacity-70" : ""}`}>
        {state === "loading" ? (
          <Spinner label="Lecture de l'étiquette…" />
        ) : (
          <>
            <Camera size={19} aria-hidden="true" /> {label}
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={state === "loading"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) read(f);
          }}
        />
      </label>
      {state === "error" && <Notice kind="error">{error}</Notice>}
    </div>
  );
}
