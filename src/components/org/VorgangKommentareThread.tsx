"use client";

import { useCallback, useEffect, useState } from "react";

import { fmtPortalDate } from "@/lib/shared/portal-detail-format";

type Kommentar = {
  id: string;
  actor_rolle: string;
  actor_name: string | null;
  text: string;
  created_at: string;
};

const ROLLE_LABELS: Record<string, string> = {
  admin: "Hausverwaltung",
  sachbearbeiter: "Hausverwaltung",
  lesen: "Hausverwaltung",
  baerenwald: "Bärenwald",
  crm: "Bärenwald",
};

export function VorgangKommentareThread({
  leadId,
  readOnly = false,
}: {
  leadId: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<Kommentar[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/vorgang-kommentare?leadId=${encodeURIComponent(leadId)}`);
    if (!res.ok) return;
    const json = (await res.json()) as { kommentare: Kommentar[] };
    setItems(json.kommentare ?? []);
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/vorgang-kommentare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, text: t }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      setText("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="vorgang-kommentare-heading">
      <h3 id="vorgang-kommentare-heading" className="portal-text-section text-text-primary">
        Verlauf &amp; Nachrichten
      </h3>
      <p className="portal-text-meta text-text-tertiary">
        Nur zwischen Ihrer Verwaltung und Bärenwald — Partner sehen diesen Thread nicht.
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <li className="portal-text-meta text-text-tertiary">Noch keine Nachrichten.</li>
        ) : (
          items.map((k) => (
            <li key={k.id} className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="text-xs text-text-tertiary">
                {ROLLE_LABELS[k.actor_rolle] ?? k.actor_rolle}
                {k.actor_name ? ` · ${k.actor_name}` : ""} · {fmtPortalDate(k.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-text-primary">{k.text}</p>
            </li>
          ))
        )}
      </ul>
      {!readOnly ? (
        <form onSubmit={send} className="space-y-2">
          <textarea
            className="portal-input min-h-[80px] w-full rounded-xl border border-border-default px-3 py-2.5 text-sm"
            placeholder="Nachricht an Bärenwald…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="btn-pill-primary" disabled={busy || !text.trim()}>
            {busy ? "Senden…" : "Senden"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
