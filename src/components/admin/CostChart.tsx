"use client";
import { useState } from "react";

export interface Series {
  key: string;
  label: string;
  color: string;
}
export interface DayRow {
  day: string;
  values: Record<string, number>;
}

/*
 * Stacked daily cost by feature. Validated categorical palette (first 5 slots of the dataviz default,
 * checked for colour-blind separation on white). Three slots are under 3:1 contrast on white, so
 * identity never relies on colour alone: legend + per-day tooltip + the table below the chart.
 */
const W = 640;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 44 };
const GAP = 2; // surface gap between stacked segments

const usd = (n: number) => `${n < 0.01 && n > 0 ? "<0,01" : n.toFixed(2).replace(".", ",")} $`;
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) ?? 10 * p;
}

export function CostChart({ series, rows, budget }: { series: Series[]; rows: DayRow[]; budget: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => series.reduce((s, x) => s + (r.values[x.key] ?? 0), 0));
  const max = niceMax(Math.max(budget, ...totals));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / rows.length;
  const barW = Math.min(28, slot * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const h = hover === null ? null : rows[hover];

  return (
    <figure className="m-0">
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink/80" aria-label="Légende">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-ink/60" />
          Plafond du jour
        </li>
      </ul>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Coût estimé par jour et par fonction. Le détail est dans le tableau ci-dessous.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="rgb(58 29 20 / 0.7)">
                {t.toFixed(max < 4 ? 1 : 0)} $
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(budget)} y2={y(budget)} stroke="rgb(58 29 20 / 0.6)" strokeWidth={1.5} strokeDasharray="5 4" />

          {rows.map((r, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            let acc = 0;
            const segs = series
              .map((s) => ({ s, v: r.values[s.key] ?? 0 }))
              .filter(({ v }) => v > 0)
              .map(({ s, v }) => {
                const y0 = y(acc);
                acc += v;
                return { s, top: y(acc), bottom: y0 };
              });
            return (
              <g key={r.day}>
                {segs.map(({ s, top, bottom }, j) => {
                  const last = j === segs.length - 1;
                  const height = Math.max(0, bottom - top - (j > 0 ? GAP : 0));
                  return last ? (
                    // Rounded data-end (4 px) on the top of the stack only.
                    <path
                      key={s.key}
                      d={`M${x},${top + height} V${top + Math.min(4, height)} Q${x},${top} ${x + Math.min(4, barW / 2)},${top} H${x + barW - Math.min(4, barW / 2)} Q${x + barW},${top} ${x + barW},${top + Math.min(4, height)} V${top + height} Z`}
                      fill={s.color}
                    />
                  ) : (
                    <rect key={s.key} x={x} y={top} width={barW} height={height} fill={s.color} />
                  );
                })}
                {(i % 2 === 0 || rows.length <= 7) && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="rgb(58 29 20 / 0.7)">
                    {dayLabel(r.day)}
                  </text>
                )}
                {/* Hit target wider and taller than the bar. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill={hover === i ? "rgb(58 29 20 / 0.05)" : "transparent"}
                  tabIndex={0}
                  role="img"
                  aria-label={`${dayLabel(r.day)} : ${usd(totals[i])}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="cursor-default outline-none focus-visible:stroke-brand focus-visible:stroke-2"
                />
              </g>
            );
          })}
        </svg>

        {h && hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-tile bg-white p-3 text-sm shadow-lift ring-1 ring-line"
            style={{ left: `clamp(0px, calc(${((PAD.left + hover * slot + slot / 2) / W) * 100}% - 5.5rem), calc(100% - 11rem))` }}
          >
            <p className="font-semibold text-ink">
              {dayLabel(h.day)} · {usd(totals[hover])}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {series.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-ink/80">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums">{usd(h.values[s.key] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </figure>
  );
}
