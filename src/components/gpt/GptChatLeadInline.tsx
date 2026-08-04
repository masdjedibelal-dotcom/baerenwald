"use client";

import { useState } from "react";

type GptChatLeadInlineProps = {
  sessionId: string;
  onSuccess: () => void;
};

export function GptChatLeadInline({ sessionId, onSuccess }: GptChatLeadInlineProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [plz, setPlz] = useState("");
  const [notizen, setNotizen] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gpt-viz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, name, email, telefon, plz, notizen }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Anfrage fehlgeschlagen.");
        return;
      }
      setDone(true);
      onSuccess();
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="gpt-viz-success" style={{ marginTop: "0.5rem" }}>
        Danke! Dein Projekt ist bei Bärenwald eingegangen.
      </p>
    );
  }

  return (
    <form className="gpt-chat-lead-form" onSubmit={(e) => void handleSubmit(e)}>
      <input type="text" placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
      <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="tel" placeholder="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
      <input type="text" placeholder="PLZ *" value={plz} onChange={(e) => setPlz(e.target.value)} required maxLength={5} />
      <textarea placeholder="Noch etwas mitteilen? (optional)" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={2} />
      {error ? <p className="gpt-viz-error">{error}</p> : null}
      <button
        type="submit"
        className="gpt-viz-btn gpt-viz-btn--primary"
        disabled={loading || (!email.trim() && !telefon.trim())}
      >
        {loading ? "Wird gesendet …" : "Projekt an Bärenwald senden"}
      </button>
    </form>
  );
}
