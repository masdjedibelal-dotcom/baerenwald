"use client";

import { useState } from "react";

type GptVizLeadFormProps = {
  sessionId: string;
  onSuccess: () => void;
};

export function GptVizLeadForm({ sessionId, onSuccess }: GptVizLeadFormProps) {
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
        body: JSON.stringify({
          session_id: sessionId,
          name,
          email,
          telefon,
          plz,
          notizen,
        }),
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
      <div className="gpt-viz-success">
        Danke! Dein Projekt ist bei Bärenwald eingegangen. Wir melden uns zeitnah.
      </div>
    );
  }

  return (
    <form className="gpt-viz-form" onSubmit={(e) => void handleSubmit(e)}>
      <p className="gpt-viz-muted">
        Projekt an Bärenwald senden — mit Visualisierung, Wunsch und Erklärung.
      </p>
      <input
        type="text"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="tel"
        placeholder="Telefon"
        value={telefon}
        onChange={(e) => setTelefon(e.target.value)}
      />
      <input
        type="text"
        placeholder="PLZ *"
        value={plz}
        onChange={(e) => setPlz(e.target.value)}
        required
        maxLength={5}
      />
      <textarea
        placeholder="Noch etwas mitteilen? (optional)"
        value={notizen}
        onChange={(e) => setNotizen(e.target.value)}
        rows={3}
        style={{
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
          padding: "0.6rem 0.75rem",
          fontSize: "0.88rem",
        }}
      />
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
