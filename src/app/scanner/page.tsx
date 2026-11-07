"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Check, Clock, Flashlight, FlashlightOff, Info, ScanBarcode, X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { type CameraError, CameraErrorPanel, ManualEntry, cameraErrorKind, formatBarcode } from "@/components/ScannerParts";
import { Spinner } from "@/components/ui";
import { KEYS, type Favorite, readLocal, writeLocal } from "@/lib/useLocal";
import { parseBarcode, productHref } from "@/lib/utils";

type Phase = "idle" | "starting" | "scanning" | "detected" | "error";

/** Last codes scanned or typed on this device (max 6). Removed with every "bc.*" key by "Supprimer mes données". */
const RECENT_KEY = "bc.recentScans";
const RECENT_MAX = 6;
interface RecentScan {
  code: string;
  at: number;
}

/** Spark vectors for the success burst (px). */
const SPARKS = [
  [0, -58],
  [41, -41],
  [58, 0],
  [41, 41],
  [0, 58],
  [-41, 41],
  [-58, 0],
  [-41, -41],
];

/** How long the "code detected" confirmation stays before the product page opens. */
const CONFIRM_MS = 350;

const STATUS: Record<Phase, string> = {
  idle: "",
  starting: "Ouverture de la caméra…",
  scanning: "Caméra active. Placez le code-barres dans le cadre.",
  detected: "Code détecté. Ouverture du produit…",
  error: "",
};

type TorchCapable = MediaTrackCapabilities & { torch?: boolean };

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const runRef = useRef(0); // invalidates a start() that is still awaiting when the user stops
  const manualRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<CameraError>("generic");
  const [detected, setDetected] = useState("");
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [recent, setRecent] = useState<(RecentScan & { name?: string; brand?: string })[]>([]);

  const stop = useCallback(() => {
    runRef.current++;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setTorch({ supported: false, on: false });
    setPhase((p) => (p === "starting" || p === "scanning" ? "idle" : p));
  }, []);

  // The camera never outlives the page, and never keeps running in a background tab.
  useEffect(() => stop, [stop]);
  useEffect(() => {
    const onHide = () => document.hidden && stop();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  // While the camera runs, hide the floating navigation so "Arrêter" owns the bottom of the screen.
  useEffect(() => {
    const on = phase === "starting" || phase === "scanning" || phase === "detected";
    if (on) document.documentElement.dataset.camera = "on";
    else delete document.documentElement.dataset.camera;
    return () => {
      delete document.documentElement.dataset.camera;
    };
  }, [phase]);

  // Recent scans; name and brand only when already known on this device (favourites).
  useEffect(() => {
    const favs = readLocal<Favorite[]>(KEYS.favorites, []);
    setRecent(readLocal<RecentScan[]>(RECENT_KEY, []).map((r) => ({ ...r, ...pick(favs.find((f) => f.code === r.code)) })));
  }, []);

  function remember(code: string) {
    const list = [{ code, at: Date.now() }, ...readLocal<RecentScan[]>(RECENT_KEY, []).filter((r) => r.code !== code)].slice(0, RECENT_MAX);
    writeLocal(RECENT_KEY, list);
  }

  function open(code: string) {
    remember(code);
    router.push(productHref(code));
  }

  async function start() {
    const run = ++runRef.current;
    setPhase("starting");
    // Bring the whole viewfinder, with "Arrêter", into view (landscape phones, small screens).
    frameRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("insecure"), { name: "SecurityError" });
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (run !== runRef.current) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current!, (result) => {
        const code = parseBarcode(result?.getText() ?? "");
        if (!code || run !== runRef.current) return; // invalid read: keep scanning
        stop();
        navigator.vibrate?.(80);
        setDetected(code);
        setPhase("detected");
        remember(code);
        window.setTimeout(() => router.push(`/produit/${code}`), CONFIRM_MS);
      });
      if (run !== runRef.current) {
        controls.stop(); // stopped while the permission prompt was open
        return;
      }
      controlsRef.current = controls;
      setPhase("scanning");
      detectTorch();
    } catch (e) {
      if (run !== runRef.current) return;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setError(cameraErrorKind(e));
      setPhase("error");
    }
  }

  /** Torch support is per device: read it from the live video track; hide the button when absent. */
  function detectTorch() {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() as TorchCapable | undefined;
    setTorch({ supported: !!caps?.torch, on: false });
  }

  async function toggleTorch() {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on: next });
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  function goManual() {
    manualRef.current?.focus();
    manualRef.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const live = phase === "starting" || phase === "scanning";
  const status = phase === "error" ? "Caméra indisponible. Vous pouvez saisir le code à la main." : STATUS[phase];

  return (
    <div data-layout="wide" className="flex flex-col gap-8 lg:gap-10">
      <header className="lg:max-w-2xl">
        <p className="eyebrow">En magasin</p>
        <h1 className="mt-2 font-display text-headline font-normal text-ink sm:text-[2.4rem] sm:leading-[1.08]">
          Scannez, <span className="italic text-brand">c&apos;est votre score.</span>
        </h1>
        <p className="mt-2 hidden max-w-xl leading-relaxed text-ink/75 sm:block [@media(max-height:32rem)]:hidden">
          Visez le code-barres d&apos;un produit : Belle vous dit s&apos;il convient à votre peau et s&apos;il est moins cher ailleurs.
        </p>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
        {/* ---------- Viewfinder: same size in every state, so nothing moves. ---------- */}
        <section aria-label="Caméra" className="lg:order-2 lg:col-span-6">
          <div ref={frameRef} className={`relative -mx-4 h-[max(15rem,min(70dvh,38rem))] overflow-hidden bg-ink sm:mx-0 sm:h-[max(15rem,min(30rem,80dvh))] sm:rounded-panel sm:shadow-lift lg:aspect-[4/3] lg:h-auto ${phase === "idle" ? "lg:bg-paper" : ""}`}>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-hidden="true" />

            {/* Idle */}
            {phase === "idle" && (
              <Overlay className="lg:bg-paper lg:ring-1 lg:ring-inset lg:ring-line">
                <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-cream/10 ring-1 ring-cream/25 lg:bg-brand-soft lg:ring-0">
                  <ScanBarcode size={32} strokeWidth={1.5} className="text-gold lg:text-brand" />
                </span>
                <p className="max-w-[17rem] text-[0.95rem] leading-relaxed text-cream/85 lg:hidden">
                  La caméra sert uniquement à lire le code-barres. Rien n&apos;est enregistré.
                </p>
                <div className="hidden max-w-[22rem] lg:block">
                  <p className="font-display text-[1.3rem] leading-tight text-ink">Pour scanner, prenez votre téléphone</p>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/75">
                    La caméra d&apos;un ordinateur lit mal les codes-barres. Ouvrez Belle sur votre téléphone en magasin, ou essayez quand même.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn min-w-[14rem] bg-gold text-lg text-ink shadow-lift hover:bg-cream focus-visible:outline-gold lg:min-w-0 lg:bg-white lg:text-base lg:text-brand lg:shadow-none lg:ring-1 lg:ring-brand/25 lg:hover:bg-paper"
                  onClick={start}
                >
                  <Camera size={20} aria-hidden="true" /> Ouvrir la caméra
                </button>
                <p className="text-sm text-cream/80 lg:hidden">Tenez le téléphone à 15 cm, bien éclairé.</p>
              </Overlay>
            )}

            {/* Starting */}
            {phase === "starting" && (
              <Overlay>
                <span className="text-cream">
                  <Spinner label="Ouverture de la caméra…" />
                </span>
                <p className="max-w-[16rem] text-sm text-cream/80">Si le navigateur le demande, autorisez l&apos;accès à la caméra.</p>
              </Overlay>
            )}

            {/* Scanning: dimmed surround, a wide target, a scan line. */}
            {phase === "scanning" && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[44%] h-32 w-[min(78%,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-tile shadow-[0_0_0_200vmax_rgb(26_12_8/0.55)]">
                  <Corner className="left-0 top-0 rounded-tl-tile border-l-4 border-t-4" />
                  <Corner className="right-0 top-0 rounded-tr-tile border-r-4 border-t-4" />
                  <Corner className="bottom-0 left-0 rounded-bl-tile border-b-4 border-l-4" />
                  <Corner className="bottom-0 right-0 rounded-br-tile border-b-4 border-r-4" />
                  <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 translate-y-[3.9rem] rounded-full bg-gold shadow-[0_0_12px_2px_rgb(249_214_137/0.7)] motion-safe:animate-scan" />
                </div>
                <p className="scrim absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold">
                  Placez le code-barres dans le cadre
                </p>
              </div>
            )}

            {/* Detected: a brief check and the code, then the product page. */}
            {phase === "detected" && (
              <Overlay>
                {/* Success burst: an expanding ring and eight sparks, then the check scales in (all within the 350 ms window). */}
                <span aria-hidden="true" className="relative grid h-20 w-20 place-items-center">
                  <span className="absolute inset-0 rounded-full border-2 border-gold opacity-0 motion-safe:animate-ring-out" />
                  {SPARKS.map(([x, y], i) => (
                    <span
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-gold opacity-0 motion-safe:animate-burst"
                      style={{ ["--bx" as string]: `${x}px`, ["--by" as string]: `${y}px` }}
                    />
                  ))}
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-good text-white shadow-lift motion-safe:animate-pop">
                    <Check size={40} strokeWidth={2.75} className="[animation-delay:120ms] motion-safe:animate-scale-in" />
                  </span>
                </span>
                <p className="font-display text-[1.4rem] text-cream">Code détecté</p>
                <p className="font-semibold tracking-[0.08em] tabular-nums text-cream/85">{formatBarcode(detected)}</p>
              </Overlay>
            )}

            {/* Error */}
            {phase === "error" && (
              <Overlay>
                <CameraErrorPanel kind={error} onRetry={start} onManual={goManual} />
              </Overlay>
            )}

            {/* Controls while the camera runs, in the thumb zone and above the home indicator. */}
            {live && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-10 [background:linear-gradient(to_top,rgb(26_12_8/0.75),transparent)] sm:pb-5">
                {torch.supported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-pressed={torch.on}
                    aria-label="Lampe torche"
                    className={`grid h-14 w-14 place-items-center rounded-full transition-colors focus-visible:outline-gold ${torch.on ? "bg-gold text-ink" : "scrim ring-1 ring-cream/30"}`}
                  >
                    {torch.on ? <Flashlight size={22} aria-hidden="true" /> : <FlashlightOff size={22} aria-hidden="true" />}
                  </button>
                )}
                <button type="button" onClick={stop} className="scrim btn min-h-14 px-7 ring-1 ring-cream/30 hover:bg-ink focus-visible:outline-gold">
                  <CameraOff size={19} aria-hidden="true" /> Arrêter
                </button>
              </div>
            )}
          </div>

        </section>

        {/* ---------- Typing the code: secondary on phones, the lead path on desktop. ---------- */}
        <div className="flex flex-col gap-6 lg:order-1 lg:col-span-6">
          <ManualEntry ref={manualRef} onSubmit={open} />

          <p className="flex gap-3 px-1 text-sm leading-relaxed text-ink/75">
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            Produit introuvable ? Vous pourrez photographier sa liste d&apos;ingrédients pour obtenir votre score.
          </p>

          {recent.length > 0 && (
            <section aria-labelledby="recent-scans">
              <div className="flex items-center justify-between gap-3">
                <h2 id="recent-scans" className="font-display text-[1.25rem] leading-tight text-ink">
                  Derniers produits scannés
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    writeLocal(RECENT_KEY, null);
                    setRecent([]);
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/75 hover:text-brand"
                >
                  <X size={15} aria-hidden="true" /> Effacer
                </button>
              </div>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card bg-white ring-1 ring-line">
                {recent.map((r) => (
                  <li key={r.code}>
                    <Link href={productHref(r.code)} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-paper">
                      <Clock size={17} aria-hidden="true" className="shrink-0 text-ink/60" />
                      <span className="min-w-0 flex-1">
                        {r.name ? (
                          <>
                            {r.brand && <span className="block truncate text-[0.7rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">{r.brand}</span>}
                            <span className="block truncate font-semibold text-ink">{r.name}</span>
                          </>
                        ) : (
                          <span className="block font-semibold tracking-[0.06em] tabular-nums text-ink">{formatBarcode(r.code)}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm text-ink/70">{ago(r.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Pieces ---------- */

function Overlay({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center sm:rounded-panel ${className}`}>{children}</div>;
}

function Corner({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute h-7 w-7 border-gold ${className}`} />;
}

const pick = (f?: Favorite) => (f ? { name: f.name, brand: f.brand } : {});

function ago(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}
