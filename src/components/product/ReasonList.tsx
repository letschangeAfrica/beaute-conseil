import { CircleCheck, CircleX, Info } from "lucide-react";
import type { Reason } from "@/lib/types";
import { reasonsByKind } from "@/lib/utils";

/** Strengths and points of attention side by side on wide screens; info notes quieter below. */
export function ReasonList({ reasons }: { reasons: Reason[] }) {
  const { plus, minus, info } = reasonsByKind(reasons);
  if (!plus.length && !minus.length && !info.length) return null;
  return (
    <section aria-labelledby="reasons-title" className="card p-5 sm:p-6">
      <h2 id="reasons-title" className="font-display text-[1.35rem] leading-tight text-ink">
        Pourquoi ce score
      </h2>
      {(plus.length > 0 || minus.length > 0) && (
        <div className="mt-4 grid gap-5 md:grid-cols-2 md:gap-6">
          {minus.length > 0 && <Column title="Points d'attention" items={minus} kind="minus" />}
          {plus.length > 0 && <Column title="Points forts" items={plus} kind="plus" />}
        </div>
      )}
      {info.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-line pt-4">
          {info.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/75">
              <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink/60" />
              {r.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Column({ title, items, kind }: { title: string; items: Reason[]; kind: "plus" | "minus" }) {
  const good = kind === "plus";
  const Icon = good ? CircleCheck : CircleX;
  return (
    <div className={`rounded-tile p-4 ${good ? "bg-good-soft/60" : "bg-danger-soft/60"}`}>
      <h3 className={`flex items-center gap-2 text-sm font-bold ${good ? "text-good" : "text-danger"}`}>
        <Icon size={17} aria-hidden="true" /> {title}
      </h3>
      <ul className="mt-2.5 space-y-2.5">
        {items.map((r, i) => (
          <li key={i} className="flex gap-2.5 text-[0.95rem] leading-snug text-ink">
            <span aria-hidden="true" className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${good ? "bg-good" : "bg-danger"}`} />
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
