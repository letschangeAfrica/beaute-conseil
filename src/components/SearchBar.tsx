"use client";
import { useRef } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { MIN_QUERY_LENGTH } from "@/lib/utils";

/**
 * The one search field of the app (Home, search screen): white pill, soft lift, primary button.
 * Controlled; `onSearch` receives the trimmed query, only when it has at least MIN_QUERY_LENGTH characters.
 */
export function SearchBar({
  value,
  onChange,
  onSearch,
  autoFocus = false,
  className = "",
  placeholder = "Produit, marque, besoin…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = value.trim();
        if (query.length >= MIN_QUERY_LENGTH) {
          input.current?.blur(); // closes the phone keyboard so the results are visible
          onSearch(query);
        }
      }}
      className={`flex items-center gap-1 rounded-full bg-white p-1.5 pl-5 shadow-lift ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-brand ${className}`}
    >
      <Search size={20} className="shrink-0 text-ink/60" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent py-2.5 pl-2 text-base text-ink outline-none placeholder:text-ink/55 [&::-webkit-search-cancel-button]:hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Rechercher un produit"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-paper hover:text-ink"
          aria-label="Effacer la recherche"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <button type="submit" className="btn-primary min-h-12 shrink-0 px-4 sm:px-6" aria-label="Rechercher">
        <ArrowRight size={20} aria-hidden="true" className="sm:hidden" />
        <span className="hidden sm:inline" aria-hidden="true">
          Rechercher
        </span>
      </button>
    </form>
  );
}
