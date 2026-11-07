import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CostChart, type Series } from "@/components/admin/CostChart";
import { PageHeader } from "@/components/ui";
import { FEATURES, type Feature, dailyBudget, readStats, spentToday } from "@/lib/guard";

export const metadata: Metadata = { title: "Coûts IA · Belle", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Validated categorical slots 1-5 (dataviz default palette), in fixed order: colour follows the feature. */
const SERIES: Record<Feature, Series> = {
  chat: { key: "chat", label: "Conseillère", color: "#2a78d6" },
  "live-prices": { key: "live-prices", label: "Prix en ligne", color: "#eb6834" },
  shade: { key: "shade", label: "Analyse selfie", color: "#1baf7a" },
  ingredients: { key: "ingredients", label: "Lecture d'étiquette", color: "#eda100" },
  "shade-match": { key: "shade-match", label: "Recherche de teinte", color: "#e87ba4" },
};
const DAYS = 14;

/**
 * Private: open in development; in production only for the Google accounts listed in ADMIN_EMAILS
 * (comma-separated). Anyone else gets a 404, so the page's existence isn't revealed.
 */
async function allowed(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return false;
  try {
    const email = (await auth())?.user?.email?.toLowerCase();
    return !!email && admins.includes(email);
  } catch {
    return false;
  }
}

const usd = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;
const int = (n: number) => n.toLocaleString("fr-FR");

export default async function CoutsPage() {
  if (!(await allowed())) notFound();

  const [stats, today] = await Promise.all([readStats(DAYS), spentToday()]);
  const budget = dailyBudget();
  const sum = (f: (s: (typeof stats)[number]["byFeature"][Feature]) => number, feature?: Feature) =>
    stats.reduce((acc, d) => acc + (feature ? f(d.byFeature[feature]) : FEATURES.reduce((a, k) => a + f(d.byFeature[k]), 0)), 0);
  const total = sum((x) => x.usd);
  const calls = sum((x) => x.calls);
  const blocked = sum((x) => x.blocked);
  const usedPct = Math.min(999, Math.round((today / budget) * 100));
  const rows = stats.map((d) => ({ day: d.day, values: Object.fromEntries(FEATURES.map((f) => [f, d.byFeature[f].usd])) }));

  return (
    <div data-layout="wide" className="flex flex-col gap-8">
      <PageHeader eyebrow="Privé" title="Coûts de l'IA" subtitle={`Estimation au prix public de Claude, ${DAYS} derniers jours. Les compteurs se remettent à zéro à minuit (UTC).`} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Aujourd'hui" value={usd(today)} note={`sur ${usd(budget)} de plafond`} />
        <Tile label="Plafond utilisé" value={`${usedPct} %`} note={usedPct >= 100 ? "Fonctions IA en pause jusqu'à minuit" : "Le plafond met l'IA en pause"} alert={usedPct >= 80} />
        <Tile label={`Total ${DAYS} jours`} value={usd(total)} note={`soit ${usd(total / DAYS)} par jour en moyenne`} />
        <Tile label="Appels à Claude" value={int(calls)} note={`${int(blocked)} demande${blocked > 1 ? "s" : ""} bloquée${blocked > 1 ? "s" : ""} par les limites`} />
      </dl>

      <section aria-labelledby="chart-title" className="card p-5 sm:p-6">
        <h2 id="chart-title" className="font-display text-[1.3rem] leading-tight text-ink">
          Coût par jour et par fonction
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink/70">Survolez ou parcourez les jours au clavier pour le détail.</p>
        {total > 0 ? <CostChart series={FEATURES.map((f) => SERIES[f])} rows={rows} budget={budget} /> : <p className="py-10 text-center text-ink/70">Aucun appel à Claude enregistré sur la période.</p>}
      </section>

      <section aria-labelledby="table-title" className="card overflow-hidden">
        <h2 id="table-title" className="p-5 font-display text-[1.3rem] leading-tight text-ink sm:px-6">
          Par fonction ({DAYS} jours)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-paper text-left text-ink/75">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold sm:px-6">Fonction</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Coût</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Appels</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Coût moyen</th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold sm:px-6">Bloquées</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => {
                const c = sum((x) => x.usd, f);
                const n = sum((x) => x.calls, f);
                return (
                  <tr key={f} className="border-t border-line">
                    <th scope="row" className="px-5 py-3 text-left font-semibold text-ink sm:px-6">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: SERIES[f].color }} />
                        {SERIES[f].label}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/85">{usd(c)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/85">{int(n)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink/85">{n ? usd(c / n) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink/85 sm:px-6">{int(sum((x) => x.blocked, f))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-ink/70">
        Estimations : le coût réel figure sur console.anthropic.com. Sans Redis configuré, les chiffres ne concernent que ce serveur et disparaissent à son redémarrage.
      </p>
    </div>
  );
}

function Tile({ label, value, note, alert = false }: { label: string; value: string; note: string; alert?: boolean }) {
  return (
    <div className={`card p-4 sm:p-5 ${alert ? "ring-2 ring-warn" : ""}`}>
      <dt className="text-sm font-semibold text-ink/75">{label}</dt>
      <dd className="mt-1 font-display text-[1.9rem] leading-tight text-ink tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs text-ink/70">{note}</dd>
    </div>
  );
}
