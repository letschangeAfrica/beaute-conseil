"use client";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Columns3,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { ProductImage } from "@/components/ProductCard";
import { HeartMark } from "@/components/product/ProductHero";
import {
  DEFAULT_PAO,
  PAO_CHOICES,
  expiryStatus,
  formatDay,
  leftLabel,
  daysLeft,
  todayLocal,
  lastUseDay,
} from "@/lib/expiry";
import type { ScoredProduct } from "@/lib/types";
import { MAX_COMPARE, useCompare, useOpened } from "@/lib/useLocal";

const STATUS_STYLE = {
  ok: "text-good",
  soon: "text-warn",
  expired: "text-danger",
} as const;

/**
 * The three things she can do with this product, side by side and self-explaining:
 * keep it (favourite), compare it, and note when she opened it. Each tile says what it does
 * before it is used and what happened after; the details open right below.
 */
export function ProductActions({
  p,
  fav,
  onToggleFav,
}: {
  p: ScoredProduct;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const compare = useCompare();
  const opened = useOpened();
  const [full, setFull] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pulse, setPulse] = useState(0);
  const formId = useId();

  const inList = compare.has(p.code);
  const n = compare.items.length;
  const openedItem = opened.get(p.code);
  const today = todayLocal();
  const status = openedItem ? expiryStatus(openedItem, today) : null;

  function onFav() {
    if (!fav) {
      setPulse((x) => x + 1);
      navigator.vibrate?.(10);
    }
    onToggleFav();
  }

  function onCompare() {
    setFull(
      !compare.toggle({
        code: p.code,
        name: p.name,
        brand: p.brand,
        image: p.image,
      }),
    );
  }

  return (
    <div className="border-t border-line p-4 sm:px-5 lg:px-6">
      <div className="grid grid-cols-3 gap-2">
        <Tile
          pressed={fav}
          onClick={onFav}
          icon={<HeartMark fav={fav} size={20} pulse={pulse} />}
          label={fav ? "En favori" : "Favori"}
          hint={fav ? "Dans Mes favoris" : "Le garder"}
        />
        <Tile
          pressed={inList}
          onClick={onCompare}
          icon={<Columns3 size={20} aria-hidden="true" />}
          label={inList ? "Comparé" : "Comparer"}
          hint={
            inList
              ? `${n} sur ${MAX_COMPARE}`
              : `Jusqu'à ${MAX_COMPARE} produits`
          }
        />
        <Tile
          pressed={!!openedItem}
          expanded={editing}
          controls={formId}
          onClick={() => setEditing((e) => !e)}
          icon={<CalendarClock size={20} aria-hidden="true" />}
          label={openedItem ? "Ouvert" : "Je l'ai ouvert"}
          hint={
            openedItem && status ? (
              <span className={`font-semibold ${STATUS_STYLE[status]}`}>
                {leftLabel(daysLeft(openedItem, today))}
              </span>
            ) : (
              "Suivre sa date"
            )
          }
        />
      </div>

      {/* What happened, and what to do next. Announced politely. */}
      <div aria-live="polite" className="empty:hidden [&>*]:mt-3">
        {full && (
          <Panel>
            <p className="text-sm leading-relaxed text-ink/80">
              Vous comparez déjà {MAX_COMPARE} produits.{" "}
              <Link
                href="/comparer"
                className="font-semibold text-brand underline underline-offset-2"
              >
                Retirez-en un
              </Link>{" "}
              pour ajouter celui-ci.
            </p>
          </Panel>
        )}
        {inList && (
          <ComparePanel
            items={compare.items}
            current={p.code}
            onRemove={compare.remove}
          />
        )}
        {editing ? (
          <OpenedForm
            id={formId}
            p={p}
            initial={openedItem}
            onSave={(item) => (opened.save(item), setEditing(false))}
            onCancel={() => setEditing(false)}
            onRemove={
              openedItem
                ? () => (opened.remove(p.code), setEditing(false))
                : undefined
            }
          />
        ) : (
          openedItem &&
          status && (
            <Panel>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 text-sm leading-relaxed">
                  <p className="text-ink/85">
                    Ouvert le {formatDay(openedItem.openedAt)}. À utiliser avant
                    le{" "}
                    <strong className="font-semibold">
                      {formatDay(lastUseDay(openedItem))}
                    </strong>
                    .
                  </p>
                  <Link
                    href="/mes-produits"
                    className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    Mes produits ouverts{" "}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Modifier la date d'ouverture"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-white hover:text-brand"
                >
                  <Pencil size={17} aria-hidden="true" />
                </button>
              </div>
            </Panel>
          )
        )}
      </div>
    </div>
  );
}

/** One action: icon, a verb, and one line saying what it does (or its current state). */
function Tile({
  pressed,
  expanded,
  controls,
  onClick,
  icon,
  label,
  hint,
}: {
  pressed: boolean;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={expanded === undefined ? pressed : undefined}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      className={`group flex min-h-[6rem] min-w-0 flex-col items-center justify-start gap-1 rounded-tile px-1.5 pb-2.5 pt-3 text-center ring-1 transition-[background-color,box-shadow,color] duration-(--duration-base) active:scale-[0.97] motion-reduce:active:scale-100 ${
        pressed || expanded
          ? "bg-brand-soft text-brand ring-brand/35"
          : "bg-white text-ink ring-line hover:ring-brand/40 hover:text-brand"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative grid h-10 w-10 place-items-center rounded-full transition-transform duration-(--duration-base) ease-(--ease-spring) group-hover:scale-105 motion-reduce:transform-none ${
          pressed ? "bg-brand text-cream" : "bg-paper text-brand"
        }`}
      >
        {icon}
        {pressed && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-good text-white ring-2 ring-white motion-safe:animate-pop">
            <Check size={10} strokeWidth={3.5} />
          </span>
        )}
      </span>
      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className="text-[0.75rem] leading-tight text-ink/70">{hint}</span>
    </button>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-tile bg-paper p-3.5 ring-1 ring-line motion-safe:animate-rise">
      {children}
    </div>
  );
}

/** The comparison as it stands: filled and empty slots, then the next step. */
function ComparePanel({
  items,
  current,
  onRemove,
}: {
  items: { code: string; name: string; image?: string }[];
  current: string;
  onRemove: (code: string) => void;
}) {
  const n = items.length;
  const slots = Array.from({ length: MAX_COMPARE }, (_, i) => items[i]);
  return (
    <Panel>
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink">Votre comparaison</span>
        <span className="text-ink/70">
          {n} sur {MAX_COMPARE}
        </span>
      </p>
      <ul
        className="mt-2.5 flex gap-2"
        aria-label={`${n} produit${n > 1 ? "s" : ""} sur ${MAX_COMPARE}`}
      >
        {slots.map((it, i) =>
          it ? (
            <li key={it.code} className="relative w-14">
              <div
                className={
                  it.code === current ? "rounded-tile ring-2 ring-brand" : ""
                }
              >
                <ProductImage src={it.image} alt={it.name} fluid />
              </div>
              {it.code !== current && (
                <button
                  type="button"
                  onClick={() => onRemove(it.code)}
                  aria-label={`Retirer ${it.name} de la comparaison`}
                  className="absolute -right-2.5 -top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white text-ink/70 shadow-soft ring-1 ring-line hover:text-danger"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ) : (
            <li
              key={`empty-${i}`}
              aria-hidden="true"
              className="grid aspect-square w-14 place-items-center rounded-tile border border-dashed border-caramel/70 text-caramel"
            >
              <Plus size={16} />
            </li>
          ),
        )}
      </ul>
      {n >= 2 ? (
        <Link
          href="/comparer"
          className="btn-primary mt-3 min-h-11 w-full px-4 text-sm"
        >
          Voir la comparaison ({n}) <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <div className="mt-3 text-sm leading-relaxed text-ink/80">
          <p>
            Pour en ajouter un autre, ouvrez sa fiche et touchez « Comparer ».
            Belle les met côte à côte.
          </p>
          <Link
            href="/recherche"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand underline-offset-2 hover:underline"
          >
            <Search size={15} aria-hidden="true" /> Chercher un produit à
            comparer
          </Link>
        </div>
      )}
    </Panel>
  );
}

type Opened = NonNullable<ReturnType<ReturnType<typeof useOpened>["get"]>>;

/** Opening date and period after opening, explained in one sentence. */
function OpenedForm({
  id,
  p,
  initial,
  onSave,
  onCancel,
  onRemove,
}: {
  id: string;
  p: ScoredProduct;
  initial?: Opened;
  onSave: (item: Opened) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [date, setDate] = useState(initial?.openedAt ?? todayLocal());
  const [months, setMonths] = useState<number>(
    initial?.months ?? p.pao ?? DEFAULT_PAO,
  );
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => dateRef.current?.focus({ preventScroll: true }), []);
  const preview = lastUseDay({ openedAt: date || todayLocal(), months });

  return (
    <form
      id={id}
      aria-label="Date d'ouverture"
      className="space-y-3.5 rounded-tile bg-paper p-3.5 ring-1 ring-line motion-safe:animate-rise"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          code: p.code,
          name: p.name,
          brand: p.brand,
          image: p.image,
          openedAt: date,
          months,
        });
      }}
    >
      <p className="text-sm leading-relaxed text-ink/80">
        Un produit ouvert se garde quelques mois. Indiquez quand vous
        l&apos;avez ouvert : Belle calcule jusqu&apos;à quand l&apos;utiliser.
      </p>
      <div>
        <label
          className="block text-sm font-semibold text-ink"
          htmlFor={`${id}-date`}
        >
          Date d&apos;ouverture
        </label>
        <input
          ref={dateRef}
          id={`${id}-date`}
          type="date"
          required
          max={todayLocal()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input mt-1.5"
        />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">
          Durée après ouverture
        </legend>
        <p className="text-xs text-ink/70">
          {p.pao
            ? `Indiquée pour ce produit : ${p.pao} mois.`
            : "Le petit pot ouvert sur l'emballage, par exemple « 12M » = 12 mois."}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PAO_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={months === m}
              onClick={() => setMonths(m)}
              className={months === m ? "chip-on" : "chip-off"}
            >
              {m} mois
            </button>
          ))}
        </div>
      </fieldset>
      {date && (
        <p className="text-sm text-ink/80">
          À utiliser avant le{" "}
          <strong className="font-semibold text-ink">
            {formatDay(preview)}
          </strong>
          .
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary min-h-11 px-5 text-sm">
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary min-h-11 px-5 text-sm"
        >
          Annuler
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="btn min-h-11 px-4 text-sm text-danger hover:bg-danger-soft"
          >
            Retirer
          </button>
        )}
      </div>
    </form>
  );
}
