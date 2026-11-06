"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Trash2, TriangleAlert } from "lucide-react";

/* ---------- Section anchor navigation ----------------------------------- */

export interface NavItem {
  id: string;
  label: string;
  /** Shown in the desktop side card. */
  Icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
}

/** Scrolls to a group and moves focus to its heading (headings carry tabIndex={-1}). */
export function jumpTo(id: string) {
  const section = document.getElementById(id);
  const heading = document.getElementById(`${id}-title`);
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  heading?.focus({ preventScroll: true });
}

/**
 * Highlights the group currently being read: the last one whose top has passed 35 % of the
 * window height, or the first one at the top of the page.
 */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom, the last group is the one being read even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

/**
 * Phones: a sticky, horizontally scrolling row of chips.
 * Desktop: a compact white card listing the sections (icon + label), with an optional footer (the save action).
 */
export function SectionNav({ items, active, variant, footer }: { items: NavItem[]; active: string; variant: "chips" | "side"; footer?: React.ReactNode }) {
  if (variant === "side")
    return (
      <div className="rounded-panel bg-white p-2 shadow-soft ring-1 ring-line">
        <nav aria-label="Sections du profil">
          <ul className="flex flex-col gap-0.5">
            {items.map(({ id, label, Icon }) => {
              const on = active === id;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpTo(id);
                    }}
                    aria-current={on ? "true" : undefined}
                    className={`group flex min-h-12 items-center gap-3 rounded-[1.1rem] px-2.5 font-semibold transition-colors duration-150 ${
                      on ? "bg-brand-soft/70 text-brand" : "text-ink/80 hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {Icon && (
                      <span
                        aria-hidden="true"
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${on ? "bg-brand text-cream" : "bg-paper text-ink/70 ring-1 ring-line group-hover:text-brand"}`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                    )}
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        {footer && <div className="mt-2 border-t border-line px-2 pb-1.5 pt-3.5">{footer}</div>}
      </div>
    );
  return (
    <nav aria-label="Sections du profil" className="sticky top-0 z-20 -mx-4 bg-cream/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <ul className="flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <li key={it.id} className="shrink-0 snap-start">
            <a
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                jumpTo(it.id);
              }}
              aria-current={active === it.id ? "true" : undefined}
              className={active === it.id ? "chip-on" : "chip-off"}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- Save bar ----------------------------------------------------- */

/**
 * Explicit save with a dirty state. `floating`: phones and tablets, a pill fixed just above the
 * navigation, shown only with unsaved changes or right after saving. `inline`: the desktop side card.
 */
export function SaveBar({ dirty, justSaved, onSave, isNew, variant }: { dirty: boolean; justSaved: boolean; onSave: () => void; isNew: boolean; variant: "floating" | "inline" }) {
  const label = isNew ? "Créer mon profil" : "Enregistrer";
  const content = justSaved ? (
    <p className="flex min-h-12 flex-1 items-center justify-center gap-2 font-semibold text-good motion-safe:animate-pop">
      <Check size={20} strokeWidth={2.75} aria-hidden="true" /> Profil enregistré
    </p>
  ) : (
    <>
      {variant === "floating" && <p className="min-w-0 flex-1 pl-3 text-sm font-semibold leading-tight text-ink">{isNew ? "Profil pas encore enregistré" : "Modifications non enregistrées"}</p>}
      <button type="button" className={`btn-primary shrink-0 ${variant === "inline" ? "w-full" : "px-5"}`} onClick={onSave} disabled={!dirty}>
        <Check size={19} aria-hidden="true" /> {variant === "floating" ? "Enregistrer" : label}
      </button>
    </>
  );

  if (variant === "inline")
    return (
      <div className="flex flex-col gap-2">
        {content}
        {!justSaved && <p className="text-center text-sm text-ink/70">{dirty ? "Modifications non enregistrées" : "Aucune modification"}</p>}
      </div>
    );

  const shown = dirty || justSaved;
  return (
    <div
      className={`save-bar fixed inset-x-3 z-30 mx-auto max-w-md transition duration-200 motion-reduce:transition-none lg:hidden ${shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
      inert={!shown}
    >
      <div className="flex items-center gap-3 rounded-full bg-white p-1.5 shadow-float ring-1 ring-line">{content}</div>
    </div>
  );
}

/* ---------- Confirmation dialog ------------------------------------------ */

/** Native modal <dialog>: traps focus, closes on Escape, returns focus to the opener. */
export function ConfirmDialog({ open, title, text, confirmLabel, onConfirm, onCancel }: { open: boolean; title: string; text: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => e.target === ref.current && onCancel()}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-panel bg-white p-0 text-ink shadow-float backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert size={22} />
        </span>
        <h2 id="confirm-title" className="mt-4 font-display text-[1.35rem] leading-tight">
          {title}
        </h2>
        <p id="confirm-text" className="mt-2 leading-relaxed text-ink/80">
          {text}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>
            Annuler
          </button>
          <button type="button" className="btn bg-danger text-white hover:bg-danger/90" onClick={onConfirm}>
            <Trash2 size={18} aria-hidden="true" /> {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
