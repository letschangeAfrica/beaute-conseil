"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, MessageCircleQuestion, RotateCcw, UserRound } from "lucide-react";
import ProductCard, { type CardData } from "@/components/ProductCard";
import { FoundationIcon, LipstickIcon, MascaraIcon, CreamJarIcon } from "@/components/icons";
import { Notice, Spinner } from "@/components/ui";
import type { ChatEvent } from "@/lib/types";
import { KEYS, readLocal, useProfile, writeLocal } from "@/lib/useLocal";
import { errorMessage } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  products?: CardData[];
  status?: string;
}

/** Messages kept on the device. */
const MAX_SAVED = 60;
/** Messages sent to the AI as context (the API accepts up to 40). */
const MAX_CONTEXT = 20;

/** The last turns of the conversation, starting with a question, in the shape the API expects. */
function recentTurns(history: Msg[]) {
  const turns = history.filter((m) => m.content.trim()).slice(-MAX_CONTEXT);
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns.map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
}

const SUGGESTIONS = [
  { text: "Quel fond de teint pour moi à moins de 25 € ?", Icon: FoundationIcon },
  { text: "Un mascara qui ne coule pas, pour yeux sensibles", Icon: MascaraIcon },
  { text: "Quelle couleur de rouge à lèvres pour un mariage ?", Icon: LipstickIcon },
  { text: "Une routine simple pour peau mixte", Icon: CreamJarIcon },
];

/** Minimal formatting: **bold**, "- " bullets and line breaks. */
function Formatted({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return null;
        const bullet = /^\s*[-•*]\s+/.test(line);
        const body = line.replace(/^\s*[-•*]\s+/, "");
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? <b key={j}>{part.slice(2, -2)}</b> : <span key={j}>{part}</span>,
        );
        return bullet ? (
          <p key={i} className="flex gap-2 pl-1">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-caramel" />
            <span>{parts}</span>
          </p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

function Avatar() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-display text-lg italic text-cream" aria-hidden>
      B
    </span>
  );
}

export default function ConseillerePage() {
  const [profile, , ready] = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore the conversation saved on this device.
  useEffect(() => {
    setMessages(readLocal<Msg[]>(KEYS.chat, []));
    setLoaded(true);
  }, []);

  // Save it once each answer is complete (not on every streamed word).
  useEffect(() => {
    if (!loaded || busy) return;
    writeLocal(KEYS.chat, messages.length ? messages.slice(-MAX_SAVED).map((m) => ({ ...m, status: undefined })) : null);
  }, [messages, busy, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "", status: "Belle réfléchit…" }]);
    setInput("");
    setBusy(true);

    const update = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = fn(copy[copy.length - 1]);
        return copy;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          messages: recentTurns(history),
        }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Une erreur est survenue.");
      }
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
          const ev = JSON.parse(line) as ChatEvent;
          switch (ev.type) {
            case "text":
              update((m) => ({ ...m, content: m.content + ev.text, status: undefined }));
              break;
            case "status":
              update((m) => ({ ...m, status: ev.text }));
              break;
            case "products":
              update((m) => {
                const seen = new Set((m.products ?? []).map((x) => x.code));
                return { ...m, products: [...(m.products ?? []), ...ev.items.filter((x) => !seen.has(x.code))] };
              });
              break;
            case "error":
              update((m) => ({ ...m, content: m.content + `\n\n${ev.text}`, status: undefined }));
              break;
          }
        }
      }
    } catch (e) {
      // Append, never replace: a dropped connection must not erase the part of the answer already shown.
      update((m) => ({ ...m, content: (m.content ? m.content + "\n\n" : "") + errorMessage(e), status: undefined }));
    } finally {
      update((m) => ({ ...m, status: undefined }));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <header className="mb-5 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand font-display text-2xl italic text-cream">B</span>
        <div className="flex-1">
          <h1 className="font-display text-2xl leading-tight">Belle</h1>
          <p className="text-sm text-ink/60">Votre conseillère beauté indépendante</p>
        </div>
        {messages.length > 0 && (
          <button className="btn-secondary min-h-10 px-4 text-sm" onClick={() => setMessages([])} disabled={busy}>
            <RotateCcw size={16} /> Nouveau
          </button>
        )}
      </header>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Avatar />
              <div className="card rounded-tl-md px-4 py-3">
                <p>
                  Bonjour{profile?.name ? ` ${profile.name}` : ""}. Je vous aide à choisir des produits adaptés à votre peau et à trouver le meilleur prix. Que
                  puis-je faire pour vous ?
                </p>
              </div>
            </div>
            {ready && !profile && (
              <Notice>
                Pour des conseils vraiment personnalisés,{" "}
                <Link href="/profil" className="font-bold text-brand underline underline-offset-2">
                  remplissez votre profil
                </Link>
                .
              </Notice>
            )}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/60">
                <MessageCircleQuestion size={17} /> Suggestions
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(({ text, Icon }) => (
                  <button key={text} onClick={() => send(text)} className="card-interactive flex items-center gap-3 p-3 text-left text-[0.95rem] font-semibold">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-brand ring-1 ring-caramel/30">
                      <Icon size={20} />
                    </span>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end gap-2">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-brand px-4 py-3 text-cream shadow-soft">{m.content}</div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-brand" aria-hidden>
                <UserRound size={18} />
              </span>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <Avatar />
              <div className="min-w-0 flex-1 space-y-2.5">
                {(m.content || m.status) && (
                  <div className="card rounded-tl-md px-4 py-3 leading-relaxed">
                    {m.content && <Formatted text={m.content} />}
                    {m.status && (
                      <p className={`text-sm text-ink/55 ${m.content ? "mt-2" : ""}`}>
                        <Spinner label={m.status} />
                      </p>
                    )}
                  </div>
                )}
                {m.products?.map((p) => (
                  <ProductCard key={p.code} p={p} />
                ))}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <p className="mt-4 px-2 text-center text-xs leading-relaxed text-ink/50">
        Vos messages et votre profil sont traités par une IA (Anthropic) pour vous répondre. La conversation est gardée sur votre téléphone, pas sur nos serveurs. Inutile de partager des
        informations médicales.{" "}
        <Link href="/confidentialite" className="underline">
          En savoir plus
        </Link>
      </p>

      <form
        className="sticky bottom-24 mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lift ring-1 ring-caramel/40 focus-within:ring-2 focus-within:ring-brand"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-ink/40"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question…"
          disabled={busy}
          aria-label="Votre question"
        />
        <button className="btn-icon" disabled={busy || !input.trim()} aria-label="Envoyer">
          <ArrowUp size={20} />
        </button>
      </form>
    </div>
  );
}
