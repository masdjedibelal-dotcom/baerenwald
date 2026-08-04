"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Ergebnis = {
  id: string;
  titel: string;
  untertitel: string;
  anlass?: string | null;
};

type Props = {
  onSelect: (id: string) => void;
};

export function OrganisationSuche({ onSelect }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Ergebnis[]>([]);
  const [open, setOpen] = useState(false);

  async function search(term: string) {
    setQ(term);
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/org/suche?q=${encodeURIComponent(term.trim())}`);
    const data = (await res.json()) as { ergebnisse?: Ergebnis[] };
    setResults(data.ergebnisse ?? []);
    setOpen(true);
  }

  return (
    <div className="portal-search relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden
      />
      <input
        type="search"
        value={q}
        onChange={(e) => void search(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Suchen…"
        aria-label="Vorgänge suchen"
        className="portal-search-input"
      />
      {open && results.length > 0 ? (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border-default bg-white shadow-lg sm:left-auto sm:right-0 sm:w-72">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onMouseDown={() => {
                  onSelect(r.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                <p className="portal-text-body font-medium">{r.titel}</p>
                <p className="portal-text-meta text-text-secondary">{r.untertitel}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
