"use client";

import { useState } from "react";

import { buildBwLeadPayload, submitBwLead } from "./LeadStep";
import { DatenschutzCheckbox } from "./DatenschutzCheckbox";

/**
 * „Individuell“ auf der Website: schlichtes Kontaktformular statt Rechner
 * (Name, E-Mail, Telefon, Vorhaben, Zeitraum, Budget — alles Freitext).
 */
export function IndividuellAnfrageForm({ onZurueck }: { onZurueck: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [vorhaben, setVorhaben] = useState("");
  const [zeitraum, setZeitraum] = useState("");
  const [budget, setBudget] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [datenschutzFehler, setDatenschutzFehler] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function absenden() {
    setFehler(null);
    if (name.trim().length < 2) return setFehler("Bitte Ihren Namen angeben.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFehler("Bitte eine gültige E-Mail angeben.");
    if (vorhaben.trim().length < 10) return setFehler("Bitte kurz beschreiben, worum es geht.");
    if (!datenschutz) {
      setDatenschutzFehler(true);
      return;
    }
    setStatus("loading");
    const nachricht = [
      vorhaben.trim(),
      zeitraum.trim() ? `Zeitraum: ${zeitraum.trim()}` : "",
      budget.trim() ? `Budget: ${budget.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      const res = await submitBwLead(
        buildBwLeadPayload({
          name: name.trim(),
          email: email.trim(),
          telefon: telefon.trim() || undefined,
          nachricht,
          situation: "individuell",
          bereiche: [],
          zeitraum: zeitraum.trim() || null,
          extra_funnel_daten: {
            leadType: "individuell",
            zeitraumText: zeitraum.trim() || null,
            budgetText: budget.trim() || null,
          },
          funnel_quelle: "beratung",
        })
      );
      if (!res.ok) {
        setStatus("idle");
        setFehler(res.error ?? "Bitte erneut versuchen oder rufen Sie uns an.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("idle");
      setFehler("Netzwerkfehler. Bitte erneut versuchen oder rufen Sie uns an.");
    }
  }

  if (status === "done") {
    return (
      <div className="individuell-danke">
        <p className="individuell-danke__titel">Danke — Ihre Anfrage ist da.</p>
        <p className="individuell-danke__text">Wir melden uns persönlich bei Ihnen, meist noch am selben Werktag.</p>
      </div>
    );
  }

  return (
    <div className="individuell-form space-y-3">
      <input
        type="text"
        placeholder="Name"
        autoComplete="name"
        className="funnel-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="E-Mail Adresse"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        className="funnel-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="tel"
        placeholder="Telefon (optional)"
        autoComplete="tel"
        inputMode="tel"
        className="funnel-input"
        value={telefon}
        onChange={(e) => setTelefon(e.target.value)}
      />
      <textarea
        placeholder="Ihr Vorhaben — was soll gemacht werden?"
        className="funnel-textarea"
        rows={5}
        value={vorhaben}
        onChange={(e) => setVorhaben(e.target.value)}
      />
      <input
        type="text"
        placeholder="Zeitraum, z. B. Frühjahr 2027 oder so bald wie möglich"
        className="funnel-input"
        value={zeitraum}
        onChange={(e) => setZeitraum(e.target.value)}
      />
      <input
        type="text"
        placeholder="Budget, z. B. ca. 20.000 € oder noch offen"
        className="funnel-input"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
      <DatenschutzCheckbox
        checked={datenschutz}
        onChange={(v) => {
          setDatenschutz(v);
          if (v) setDatenschutzFehler(false);
        }}
        showError={datenschutzFehler}
      />
      {fehler ? <p className="field-error">{fehler}</p> : null}
      <div className="individuell-form__aktionen">
        <button type="button" className="individuell-form__zurueck" onClick={onZurueck}>
          ← Andere Auswahl
        </button>
        <button
          type="button"
          className="komplex-submit-btn"
          disabled={status === "loading"}
          onClick={() => void absenden()}
        >
          {status === "loading" ? "Wird gesendet…" : "Anfrage senden"}
        </button>
      </div>
    </div>
  );
}
