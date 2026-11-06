"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CameraOff, Keyboard, ScanBarcode } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { Notice, PageHeader } from "@/components/ui";
import { parseBarcode } from "@/lib/utils";

function Corners() {
  const c = "absolute h-8 w-8 border-gold";
  return (
    <div className="pointer-events-none absolute inset-x-10 top-1/2 h-36 -translate-y-1/2">
      <span className={`${c} left-0 top-0 rounded-tl-2xl border-l-4 border-t-4`} />
      <span className={`${c} right-0 top-0 rounded-tr-2xl border-r-4 border-t-4`} />
      <span className={`${c} bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4`} />
      <span className={`${c} bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4`} />
      <span className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse bg-gold/80" />
    </div>
  );
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const router = useRouter();

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  async function start() {
    setError("");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      setActive(true);
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result) => {
          const code = parseBarcode(result?.getText() ?? "");
          if (code) {
            stop();
            navigator.vibrate?.(80);
            router.push(`/produit/${code}`);
          }
        },
      );
    } catch {
      setActive(false);
      setError("Impossible d'ouvrir la caméra. Autorisez l'accès à la caméra dans votre navigateur, ou saisissez le code ci-dessous.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Scanner en magasin" subtitle="Visez le code-barres : Belle vous dit si le produit vous convient et s'il est moins cher ailleurs." />

      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-ink shadow-lift">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {active && <Corners />}
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center text-cream">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-cream/10 ring-1 ring-cream/20">
              <ScanBarcode size={38} strokeWidth={1.5} className="text-gold" />
            </span>
            <p className="max-w-60 text-cream/80">Tenez le téléphone à 15 cm du code-barres, bien éclairé.</p>
            <button className="btn bg-gold text-ink hover:bg-cream" onClick={start}>
              <Camera size={19} /> Ouvrir la caméra
            </button>
          </div>
        )}
        {active && (
          <button
            className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/70 px-5 py-2.5 text-sm font-semibold text-cream backdrop-blur"
            onClick={stop}
          >
            <CameraOff size={17} /> Arrêter
          </button>
        )}
      </div>

      {error && <Notice kind="warn">{error}</Notice>}

      <form
        className="card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const code = parseBarcode(manual);
          if (code) router.push(`/produit/${code}`);
        }}
      >
        <label className="mb-3 flex items-center gap-2 font-bold" htmlFor="ean">
          <Keyboard size={19} className="text-brand" /> Saisir le code à la main
        </label>
        <div className="flex gap-2">
          <input
            id="ean"
            className="input tracking-widest tabular-nums"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="3600530171910"
          />
          <button className="btn-icon" aria-label="Valider le code" disabled={!parseBarcode(manual)}>
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
