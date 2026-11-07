"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Columns3, Pencil } from "lucide-react";
import { DEFAULT_PAO, PAO_CHOICES, expiryStatus, formatDay, leftLabel, daysLeft, todayLocal, lastUseDay } from "@/lib/expiry";
import type { ScoredProduct } from "@/lib/types";
import { MAX_COMPARE, useCompare, useOpened } from "@/lib/useLocal";

/** Below the verdict: add to the comparison, and note when she opened the product. */
export function ProductActions({ p }: { p: ScoredProduct }) {
  return (
    <div className="card divide-y divide-line">
      <CompareAction p={p} />
      <OpenedAction p={p} />
    </div>
  );
}

function CompareAction({ p }: { p: ScoredProduct }) {
  const { items, has, toggle } = useCompare();
  const [full, setFull] = useState(false);
  const inList = has(p.code);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <button
        type="button"
        aria-pressed={inList}
        onClick={() => setFull(!toggle({ code: p.code, name: p.name, brand: p.brand, image: p.image }))}
        className={inList ? "chip-on" : "chip-off"}
      >
        <Columns3 size={16} aria-hidden="true" /> {inList ? "Dans la comparaison" : "Comparer"}
      </button>
      {items.length >= 2 && (
        <Link href="/comparer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand underline-offset-2 hover:underline">
          Voir la comparaison ({items.length}) <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
      {full && (
        <p role="status" className="w-full text-sm text-ink/75">
          Vous comparez déjà {MAX_COMPARE} produits.{" "}
          <Link href="/comparer" className="font-semibold text-brand underline">
            Retirez-en un
          </Link>{" "}
          pour ajouter celui-ci.
        </p>
      )}
    </div>
  );
}

const STATUS_STYLE = { ok: "text-good", soon: "text-warn", expired: "text-danger" } as const;

function OpenedAction({ p }: { p: ScoredProduct }) {
  const { get, save, remove } = useOpened();
  const opened = get(p.code);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [months, setMonths] = useState<number>(p.pao ?? DEFAULT_PAO);

  function startEdit() {
    setDate(opened?.openedAt ?? todayLocal());
    setMonths(opened?.months ?? p.pao ?? DEFAULT_PAO);
    setEditing(true);
  }

  if (!editing && opened) {
    const today = todayLocal();
    const status = expiryStatus(opened, today);
    return (
      <div className="flex items-start gap-3 p-4">
        <CalendarClock size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p className="text-ink/85">
            Ouvert le {formatDay(opened.openedAt)} · à utiliser avant le <strong className="font-semibold">{formatDay(lastUseDay(opened))}</strong>
          </p>
          <p className={`font-semibold ${STATUS_STYLE[status]}`}>{leftLabel(daysLeft(opened, today))}</p>
          <Link href="/mes-produits" className="mt-1 inline-flex min-h-11 items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline">
            Mes produits ouverts <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <button type="button" onClick={startEdit} aria-label="Modifier la date d'ouverture" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-paper hover:text-brand">
          <Pencil size={17} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="p-4">
        <button type="button" onClick={startEdit} className="chip-off">
          <CalendarClock size={16} aria-hidden="true" /> J&apos;ai ouvert ce produit
        </button>
        <p className="mt-2 text-xs text-ink/70">Belle vous rappellera jusqu&apos;à quand l&apos;utiliser.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save({ code: p.code, name: p.name, brand: p.brand, image: p.image, openedAt: date, months });
        setEditing(false);
      }}
    >
      <label className="block text-sm font-semibold text-ink" htmlFor={`opened-${p.code}`}>
        Date d&apos;ouverture
      </label>
      <input id={`opened-${p.code}`} type="date" required max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Durée après ouverture</legend>
        <p className="text-xs text-ink/70">
          {p.pao ? `Indiquée pour ce produit : ${p.pao} mois.` : "Le petit pot ouvert sur l'emballage, par exemple « 12M » = 12 mois."}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PAO_CHOICES.map((m) => (
            <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)} className={months === m ? "chip-on" : "chip-off"}>
              {m} mois
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className="btn-primary min-h-11 px-5 text-sm">
          Enregistrer
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary min-h-11 px-5 text-sm">
          Annuler
        </button>
        {opened && (
          <button
            type="button"
            onClick={() => {
              remove(p.code);
              setEditing(false);
            }}
            className="btn min-h-11 px-4 text-sm text-danger hover:bg-danger-soft"
          >
            Retirer
          </button>
        )}
      </div>
    </form>
  );
}
