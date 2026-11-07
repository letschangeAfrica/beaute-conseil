"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, RotateCcw } from "lucide-react";
import {
  ChatEmpty,
  ProfileSummary,
  SUGGESTIONS,
  SuggestionButton,
} from "@/components/chat/ChatEmpty";
import { Composer } from "@/components/chat/Composer";
import {
  BelleAvatar,
  BelleMessage,
  type Msg,
  UserBubble,
} from "@/components/chat/MessageBubble";
import type { ChatEvent } from "@/lib/types";
import { KEYS, readLocal, useProfile, writeLocal } from "@/lib/useLocal";
import { errorMessage } from "@/lib/utils";

/** Messages kept on the device. */
const MAX_SAVED = 60;
/** Messages sent to the AI as context (the API accepts up to 40). */
const MAX_CONTEXT = 20;

/** The last turns of the conversation, starting with a question, in the shape the API expects. */
function recentTurns(history: Msg[]) {
  const turns = history.filter((m) => m.content.trim()).slice(-MAX_CONTEXT);
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns.map(({ role, content }) => ({
    role,
    content: content.slice(0, 8000),
  }));
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const nearBottom = () =>
  window.innerHeight + window.scrollY >=
  document.documentElement.scrollHeight - 160;

export default function ConseillerePage() {
  const [profile, , ready] = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);
  const [announce, setAnnounce] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const followRef = useRef(true); // follow new content only when she is already near the bottom
  const restoredRef = useRef(0); // messages restored from the phone (they don't animate in)

  // Restore the conversation saved on this device.
  useEffect(() => {
    const saved = readLocal<Msg[]>(KEYS.chat, []);
    restoredRef.current = saved.length; // restored history appears at once; only new messages rise in
    setMessages(saved);
    setLoaded(true);
  }, []);

  // Save it once each answer is complete (not on every streamed word).
  useEffect(() => {
    if (!loaded || busy) return;
    writeLocal(
      KEYS.chat,
      messages.length
        ? messages.slice(-MAX_SAVED).map((m) => ({ ...m, status: undefined }))
        : null,
    );
  }, [messages, busy, loaded]);

  // Smart scrolling.
  useEffect(() => {
    const onScroll = () => {
      followRef.current = nearBottom();
      if (followRef.current) setUnread(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toBottom = useCallback((smooth: boolean) => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: smooth && !reducedMotion() ? "smooth" : "auto",
    });
    followRef.current = true;
    setUnread(false);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (followRef.current) toBottom(!busy);
    else setUnread(true);
  }, [messages, busy, toBottom]);

  // Stop any request when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string, base: Msg[] = messages) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...base, { role: "user", content: question }];
    setMessages([
      ...history,
      { role: "assistant", content: "", status: "Belle réfléchit…" },
    ]);
    setInput("");
    setBusy(true);
    setAnnounce("Belle prépare sa réponse.");
    followRef.current = true;
    inputRef.current?.focus();

    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
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
              update((m) => ({
                ...m,
                content: m.content + ev.text,
                status: undefined,
              }));
              break;
            case "status":
              update((m) => ({ ...m, status: ev.text }));
              break;
            case "products":
              update((m) => {
                const seen = new Set((m.products ?? []).map((x) => x.code));
                return {
                  ...m,
                  products: [
                    ...(m.products ?? []),
                    ...ev.items.filter((x) => !seen.has(x.code)),
                  ],
                };
              });
              break;
            case "error":
              // Its own paragraph, shown as a notice under the answer rather than inside Belle's words.
              update((m) => ({
                ...m,
                error: m.error ? `${m.error}\n\n${ev.text}` : ev.text,
                status: undefined,
              }));
              break;
          }
        }
      }
      setAnnounce("Belle a répondu.");
    } catch (e) {
      if (controller.signal.aborted) {
        // She pressed "Arrêter": keep the partial answer, no error.
        update((m) => ({ ...m, stopped: true }));
        setAnnounce("Réponse interrompue.");
      } else {
        // Append, never replace: a dropped connection must not erase the part of the answer already shown.
        const msg = errorMessage(e);
        update((m) => ({
          ...m,
          error: m.error ? `${m.error}\n\n${msg}` : msg,
          status: undefined,
        }));
        setAnnounce(`Erreur : ${msg}`);
      }
    } finally {
      update((m) => ({ ...m, status: undefined }));
      setBusy(false);
      abortRef.current = null;
    }
  }

  /** Ask the last question again after an error, replacing the failed exchange. */
  function retry() {
    const lastUser = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUser < 0) return;
    send(messages[lastUser].content, messages.slice(0, lastUser));
  }

  const newConversation = () => {
    restoredRef.current = 0;
    setMessages([]);
    inputRef.current?.focus();
  };

  const empty = loaded && messages.length === 0;
  const lastIndex = messages.length - 1;

  return (
    <div
      data-layout="wide"
      className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[19rem_minmax(0,1fr)_17rem]"
    >
      {/* Side panel (desktop): profile, new conversation, starters. */}
      <aside aria-label="Votre profil et des idées" className="hidden lg:block">
        <div className="sticky top-6 flex flex-col gap-5">
          <ProfileSummary profile={profile} ready={ready} />
          <button
            type="button"
            onClick={newConversation}
            disabled={busy || messages.length === 0}
            className="btn-secondary w-full"
          >
            <RotateCcw size={17} aria-hidden="true" /> Nouvelle conversation
          </button>
          {!empty && (
            <div>
              <h2 className="eyebrow">Autres idées</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {SUGGESTIONS.slice(0, 4).map(({ text, Icon }) => (
                  <li key={text}>
                    <SuggestionButton
                      text={text}
                      Icon={Icon}
                      onPick={(t) => send(t)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-[42rem] flex-col">
        <header className="flex items-center gap-3.5">
          <BelleAvatar size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.7rem] leading-tight text-ink">
              Belle
            </h1>
            <p className="text-sm text-ink/75">
              Conseillère beauté indépendante
            </p>
          </div>
          {/* Always laid out (hidden until there is a conversation) so the header never changes height when the history loads. */}
          <button
            type="button"
            className={`btn-secondary min-h-11 px-4 text-sm lg:hidden ${messages.length > 0 ? "" : "invisible"}`}
            onClick={newConversation}
            disabled={busy || messages.length === 0}
            aria-label="Nouvelle conversation"
          >
            <RotateCcw size={16} aria-hidden="true" /> Nouveau
          </button>
        </header>

        <div className="mt-3 lg:hidden">
          <ProfileSummary
            profile={profile}
            ready={ready}
            compact={!empty || !!profile}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {announce}
        </p>

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversation avec Belle"
          className="mt-6 flex flex-1 flex-col gap-5"
        >
          {empty && <ChatEmpty name={profile?.name} onPick={(t) => send(t)} />}

          {messages.map((m, i) => {
            const streaming = busy && i === lastIndex;
            const fresh = i >= restoredRef.current;
            return m.role === "user" ? (
              <div key={i} className={fresh ? "motion-safe:animate-rise" : ""}>
                <UserBubble m={m} />
              </div>
            ) : (
              // While streaming, the answer is hidden from the log (no word-by-word announcement);
              // the new key on completion adds it once, in full (without replaying the entrance).
              <div
                key={streaming ? `live-${i}` : i}
                aria-hidden={streaming || undefined}
                className={streaming ? "motion-safe:animate-rise" : ""}
              >
                <BelleMessage
                  m={m}
                  streaming={streaming}
                  onRetry={
                    !busy && i === lastIndex && m.error ? retry : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        <p className="mt-6 px-2 text-center text-xs leading-relaxed text-ink/70">
          Vos messages et votre profil sont traités par une IA (Anthropic) pour
          vous répondre. La conversation est gardée sur votre téléphone, pas sur
          nos serveurs. Inutile de partager des informations médicales.{" "}
          <Link
            href="/confidentialite"
            className="font-semibold underline underline-offset-2"
          >
            En savoir plus
          </Link>
        </p>

        {unread && (
          <div className="pointer-events-none sticky bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+9rem)] z-20 flex justify-center">
            <button
              type="button"
              onClick={() => toBottom(true)}
              className="pointer-events-auto btn min-h-11 bg-ink px-4 text-sm text-cream shadow-float hover:bg-ink/90"
            >
              <ArrowDown size={16} aria-hidden="true" /> Nouveaux messages
            </button>
          </div>
        )}

        <Composer
          value={input}
          onChange={setInput}
          onSend={() => send(input)}
          onStop={() => abortRef.current?.abort()}
          busy={busy}
          inputRef={inputRef}
        />
      </div>

      {/* Wide screens: a quiet column on the right keeps the conversation centred. */}
      <div aria-hidden="true" className="hidden xl:block" />
    </div>
  );
}
