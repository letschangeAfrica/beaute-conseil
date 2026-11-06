"use client";
import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";

const MAX_LINES = 5;

/**
 * Multi-line question field: grows up to 5 lines, Enter sends, Shift+Enter adds a line.
 * While Belle answers it is read-only (not disabled, so focus stays here) and Send becomes Stop.
 * On touch screens, focusing it hides the floating navigation so the keyboard never covers it.
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const local = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow up to MAX_LINES, then scroll inside.
  useEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_LINES + 20)}px`;
  }, [value]);

  // Keyboard open on a phone: let the composer take the bottom of the screen.
  useEffect(() => () => void delete document.documentElement.dataset.keyboard, []);
  const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  return (
    <div className="chat-composer sticky z-20 mt-3">
      {/* Cream backdrop so the conversation never shows between the composer and the navigation. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-4 -bottom-[10rem] -top-5 -z-10 bg-gradient-to-b from-cream/0 via-cream via-25% to-cream" />
      <form
        className="flex items-end gap-2 rounded-[1.6rem] bg-white p-1.5 pl-4 shadow-lift ring-1 ring-line focus-within:ring-2 focus-within:ring-brand"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onSend();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Votre question à Belle
        </label>
        <textarea
          id="chat-input"
          ref={(el) => {
            local.current = el;
            inputRef.current = el;
          }}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!busy) onSend();
            }
          }}
          onFocus={() => coarse() && (document.documentElement.dataset.keyboard = "on")}
          onBlur={() => delete document.documentElement.dataset.keyboard}
          readOnly={busy}
          aria-disabled={busy || undefined}
          enterKeyHint="send"
          placeholder={busy ? "Belle vous répond…" : "Posez votre question…"}
          className="max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-ink outline-none placeholder:text-ink/55"
        />
        {busy ? (
          <button type="button" onClick={onStop} className="btn-icon h-11 w-11 bg-ink hover:bg-ink/85" aria-label="Arrêter la réponse">
            <Square size={15} fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className="btn-icon h-11 w-11" disabled={!value.trim()} aria-label="Envoyer">
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        )}
      </form>
    </div>
  );
}
