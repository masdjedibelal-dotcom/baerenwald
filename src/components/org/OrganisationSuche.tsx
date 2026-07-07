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
    <div className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      <input
        type="search"
        value={q}
        onChange={(e) => void search(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Vorgänge suchen …"
        className="input-field w-56 pl-9 portal-btn-compact"
      />
      {open && results.length > 0 ? (
        <ul className="absolute right-0 z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-xl border border-border-default bg-white shadow-lg">
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
