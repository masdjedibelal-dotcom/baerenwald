"use client";

import { useState } from "react";

import { type PartnerBewerbung, sendePartnerBewerbung } from "@/app/actions/partner-bewerbung";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";

const LEER: PartnerBewerbung = {
  firma: "",
  ansprechpartner: "",
  gewerk: "",
  einsatzgebiet: "",
  email: "",
  telefon: "",
  nachricht: "",
  datenschutz: false,
  website: "",
};

/** Kurzes Kontaktformular für Handwerksbetriebe, die mit Bärenwald arbeiten möchten. */
export function PartnerBewerbungForm() {
  const [b, setB] = useState<PartnerBewerbung>(LEER);
  const [fehler, setFehler] = useState<string | null>(null);
  const [dsFehler, setDsFehler] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const set = <K extends keyof PartnerBewerbung>(k: K, v: PartnerBewerbung[K]) => setB((p) => ({ ...p, [k]: v }));

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!b.datenschutz) {
      setDsFehler(true);
      return;
    }
    setStatus("loading");
    setFehler(null);
    const res = await sendePartnerBewerbung(b);
    if (res.ok) {
      setStatus("done");
      return;
    }
    setFehler(res.error);
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="partner-bewerbung__danke" role="status">
        <p className="partner-bewerbung__danke-titel">Vielen Dank für Ihr Interesse.</p>
        <p>Ihre Bewerbung ist eingegangen. Wir prüfen Ihre Angaben und melden uns bei Ihnen.</p>
      </div>
    );
  }

  const feld = (k: "firma" | "ansprechpartner" | "gewerk" | "einsatzgebiet" | "email" | "telefon", label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="anfrage-feld">
      <span className="anfrage-feld__label">{label}</span>
      <input className="funnel-input" value={b[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </label>
  );

  return (
    <form className="partner-bewerbung" onSubmit={absenden} noValidate>
      {feld("firma", "Firmenname *", { autoComplete: "organization" })}
      {feld("ansprechpartner", "Ansprechpartner *", { autoComplete: "name" })}
      {feld("gewerk", "Gewerk bzw. Gewerke *", { placeholder: "z. B. Sanitär, Fliesen" })}
      {feld("einsatzgebiet", "Einsatzgebiet", { placeholder: "z. B. München Süd, Landkreis Starnberg" })}
      <div className="anfrage-zeile">
        {feld("email", "E-Mail", { type: "email", autoComplete: "email", inputMode: "email" })}
        {feld("telefon", "Telefon", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
      </div>
      <label className="anfrage-feld">
        <span className="anfrage-feld__label">Kurze Vorstellung (optional)</span>
        <textarea className="funnel-input" rows={4} value={b.nachricht} onChange={(e) => set("nachricht", e.target.value)} />
      </label>
      <input
        className="partner-bewerbung__hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={b.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <DatenschutzCheckbox
        checked={b.datenschutz}
        onChange={(v) => {
          set("datenschutz", v);
          if (v) setDsFehler(false);
        }}
        showError={dsFehler}
      />
      {fehler ? <p className="field-error">{fehler}</p> : null}
      <button type="submit" className="btn-pill-primary partner-bewerbung__senden" disabled={status === "loading"}>
        {status === "loading" ? "Wird gesendet …" : "Bewerbung senden"}
      </button>
    </form>
  );
}
