/**
 * Advisor evaluation runner.
 *
 *   1. In .env.local: ANTHROPIC_API_KEY=… and EVAL_TOKEN=<any random string of 16+ characters>
 *   2. npm run dev                      (the runner calls the real /api/chat, same prompt and tools as users get)
 *   3. npm run eval:advisor             (all cases, 1 run each)
 *      npm run eval:advisor -- --reps 3 --only allergy
 *
 * Each case costs real Claude tokens (roughly 0.05–0.15 $ per case; the daily budget cap still applies).
 * Results go to evals/advisor/runs/<date>/: results.jsonl (one graded row per case and run, with the full
 * transcript), errors.jsonl (infrastructure failures, never counted as model failures) and summary.md.
 */
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CASES } from "../evals/advisor/cases";
import { type EvalCase, type Transcript, gradeCase } from "../src/lib/eval/graders";

/* ---------- Options ---------- */

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3000");
const REPS = Math.max(1, Number(arg("reps", "1")));
const ONLY = arg("only", ""); // filter on id or tag
const CONCURRENCY = Math.max(1, Number(arg("concurrency", "2")));
const CASE_TIMEOUT_MS = 150_000; // hard ceiling per case, independent of the stream staying alive

function readEnvToken(): string {
  if (process.env.EVAL_TOKEN) return process.env.EVAL_TOKEN;
  const file = path.join(process.cwd(), ".env.local");
  if (existsSync(file)) {
    const m = /^EVAL_TOKEN=(.+)$/m.exec(readFileSync(file, "utf8"));
    if (m) return m[1].trim();
  }
  return "";
}
const TOKEN = readEnvToken();

/* ---------- One case ---------- */

type Row = { id: string; rep: number; tags: string[]; pass: boolean; checks: ReturnType<typeof gradeCase>; latencyMs: number; transcript: Transcript };
type Failure = { id: string; rep: number; class: "http" | "timeout" | "server-error" | "network"; detail: string };

async function runCase(c: EvalCase, rep: number): Promise<Row | Failure> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);
  const t: Transcript = { text: "", statuses: [], products: [], errors: [], allergensByCode: {} };
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-belle-eval": TOKEN },
      body: JSON.stringify({ profile: c.profile, messages: c.messages }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return { id: c.id, rep, class: "http", detail: `${res.status} ${(await res.text()).slice(0, 200)}` };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.type === "text") t.text += ev.text;
        else if (ev.type === "status") t.statuses.push(ev.text);
        else if (ev.type === "products") t.products.push(...ev.items);
        else if (ev.type === "error") t.errors.push(ev.text);
      }
    }
    // A server-side failure is infrastructure, not a wrong answer.
    if (t.errors.length && !t.text.trim()) return { id: c.id, rep, class: "server-error", detail: t.errors.join(" | ") };

    // Allergy check: look each product card up with her profile (free: product data only, no AI).
    if (c.profile?.allergies.length) {
      for (const code of new Set(t.products.map((p) => p.code))) {
        const r = await fetch(`${BASE}/api/product/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: c.profile }) });
        const json = r.ok ? await r.json() : null;
        t.allergensByCode[code] = json?.product?.allergyHit ?? [];
      }
    }

    const checks = gradeCase(c, t);
    return { id: c.id, rep, tags: c.tags, pass: checks.every((x) => x.pass), checks, latencyMs: Date.now() - started, transcript: t };
  } catch (e) {
    const aborted = controller.signal.aborted;
    return { id: c.id, rep, class: aborted ? "timeout" : "network", detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Run ---------- */

async function main() {
  if (!TOKEN || TOKEN.length < 16) {
    console.error("EVAL_TOKEN manquant (16 caractères minimum) : ajoutez-le à .env.local puis relancez npm run dev.");
    process.exit(1);
  }
  const health = await fetch(BASE).catch(() => null);
  if (!health) {
    console.error(`Le serveur ne répond pas sur ${BASE}. Lancez d'abord : npm run dev`);
    process.exit(1);
  }

  const cases = CASES.filter((c) => !ONLY || c.id.includes(ONLY) || c.tags.includes(ONLY));
  const jobs = cases.flatMap((c) => Array.from({ length: REPS }, (_, rep) => ({ c, rep })));
  const dir = path.join("evals", "advisor", "runs", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
  mkdirSync(dir, { recursive: true });
  console.log(`${jobs.length} essai(s) : ${cases.length} cas × ${REPS} run(s) → ${dir}`);

  const rows: Row[] = [];
  const failures: Failure[] = [];
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const { c, rep } = jobs[next++];
      const out = await runCase(c, rep);
      if ("checks" in out) {
        rows.push(out);
        appendFileSync(path.join(dir, "results.jsonl"), JSON.stringify(out) + "\n");
        console.log(`${out.pass ? "PASS" : "FAIL"}  ${c.id} #${rep + 1}  ${out.checks.filter((x) => !x.pass).map((x) => `${x.check}(${x.detail})`).join(" ")}`);
      } else {
        failures.push(out);
        appendFileSync(path.join(dir, "errors.jsonl"), JSON.stringify(out) + "\n");
        console.log(`ERR   ${c.id} #${rep + 1}  ${out.class}: ${out.detail}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(path.join(dir, "summary.md"), summary(cases, rows, failures));
  console.log(`\n${summary(cases, rows, failures)}`);
}

/* ---------- Summary ---------- */

function summary(cases: EvalCase[], rows: Row[], failures: Failure[]): string {
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const lines = [`# Évaluation de la conseillère`, "", `Essais notés : ${rows.length} · erreurs d'infrastructure (non comptées) : ${failures.length}`, ""];
  lines.push(`**Cas réussis : ${pct(rows.filter((r) => r.pass).length, rows.length)}**`, "");

  // Per check, across all rows.
  const byCheck = new Map<string, { pass: number; total: number }>();
  for (const r of rows) for (const c of r.checks) {
    const s = byCheck.get(c.check) ?? { pass: 0, total: 0 };
    s.total++;
    if (c.pass) s.pass++;
    byCheck.set(c.check, s);
  }
  lines.push("| Vérification | Réussite |", "|---|---|");
  for (const [k, s] of [...byCheck].sort((a, b) => a[1].pass / a[1].total - b[1].pass / b[1].total)) lines.push(`| ${k} | ${pct(s.pass, s.total)} (${s.pass}/${s.total}) |`);

  // Per case, with spread across runs.
  lines.push("", "| Cas | Tags | Réussite (runs) | Échecs |", "|---|---|---|---|");
  for (const c of cases) {
    const rs = rows.filter((r) => r.id === c.id);
    const fails = [...new Set(rs.flatMap((r) => r.checks.filter((x) => !x.pass).map((x) => x.check)))];
    lines.push(`| ${c.id} | ${c.tags.join(", ")} | ${rs.filter((r) => r.pass).length}/${rs.length} | ${fails.join(", ") || "—"} |`);
  }
  const lat = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  if (lat.length) lines.push("", `Latence médiane : ${(lat[Math.floor(lat.length / 2)] / 1000).toFixed(1)} s · max : ${(lat.at(-1)! / 1000).toFixed(1)} s`);
  lines.push("", "Coût : voir /admin/couts (fonction « Conseillère ») avant et après le run.");
  return lines.join("\n") + "\n";
}

main();
