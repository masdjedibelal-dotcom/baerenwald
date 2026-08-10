"use client";

import { useState } from "react";

import {
  buildBwLeadPayload,
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { getPlzStatus } from "@/lib/funnel/plz";
import type { EnrichLeadContext } from "@/lib/lead/enrich-funnel-for-lead";
import { produktPreis } from "@/lib/products/produkt-preis";
import { track } from "@/lib/analytics";

type Props = {
  produktSlug: string;
  leadContext: EnrichLeadContext;
  /** Nach erfolgreichem Lead z. B. /portal */
  returnTo?: string;
  contactPrefill?: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    plz?: string;
    ort?: string;
    strasse?: string;
    hausnummer?: string;
  };
  onSuccess?: (leadId: string) => void;
};

export function KatalogLeadForm({
  produktSlug,
  leadContext,
  returnTo,
  contactPrefill,
  onSuccess,
}: Props) {
  const [vorname, setVorname] = useState(contactPrefill?.vorname ?? "");
  const [nachname, setNachname] = useState(contactPrefill?.nachname ?? "");
  const [strasse, setStrasse] = useState(contactPrefill?.strasse ?? "");
  const [hausnummer, setHausnummer] = useState(contactPrefill?.hausnummer ?? "");
  const [plz, setPlz] = useState(contactPrefill?.plz ?? "");
  const [ort, setOrt] = useState(contactPrefill?.ort ?? "");
  const [email, setEmail] = useState(contactPrefill?.email ?? "");
  const [telefon, setTelefon] = useState(contactPrefill?.telefon ?? "");
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const plzOk = getPlzStatus(plz) === "erlaubt";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vorname.trim()) {
      setError("Bitte Vorname angeben.");
      return;
    }
    if (!nachname.trim()) {
      setError("Bitte Nachname angeben.");
      return;
    }
    if (!strasse.trim()) {
      setError("Bitte Straße angeben.");
      return;
    }
    if (!plzOk) {
      setError("Bitte gültige Münchner PLZ eingeben.");
      return;
    }
    if (!ort.trim()) {
      setError("Bitte Ort angeben.");
      return;
    }
    if (!email.trim() && !telefon.trim()) {
      setError("E-Mail oder Telefon angeben.");
      return;
    }
    if (!privacy) {
      setError("Bitte Datenschutz bestätigen.");
      return;
    }

    const preis = produktPreis(produktSlug);
    if (!preis) {
      setError("Produkt nicht gefunden.");
      return;
    }

    setLoading(true);
    const state = {
      ...preis.state,
      plz: plz.trim(),
      ort: ort.trim(),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      name: `${vorname.trim()} ${nachname.trim()}`.trim(),
      email: email.trim(),
      telefon: telefon.trim(),
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim(),
      priceMin: preis.min,
      priceMax: preis.max,
      breakdown: preis.breakdown,
    };

    const payload = buildBwLeadPayload({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      email: email.trim() || undefined,
      telefon: telefon.trim() || undefined,
      situation: state.situation,
      bereiche: state.bereiche,
      preis_min: preis.min,
      preis_max: preis.max,
      plz: plz.trim(),
      strasse: strasse.trim() || undefined,
      hausnummer: hausnummer.trim() || undefined,
      funnel_daten: serializeFunnelStateForLead(state, {
        ...leadContext,
        produktSlug,
        funnelQuelle: leadContext.funnelQuelle ?? "katalog",
      }),
      extra_funnel_daten: { ort: ort.trim() },
      funnel_quelle: leadContext.funnelQuelle ?? "katalog",
    });

    const result = await submitBwLead(payload);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    track.produktGewaehlt(
      produktSlug,
      leadContext.leistungSlug ?? "katalog",
      leadContext.katalogQuelle ?? "katalog"
    );
    track.leadAbgeschickt(produktSlug);
    setDone(true);
    onSuccess?.(result.id);
    if (returnTo && typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.href = returnTo;
      }, 1800);
    }
  }

  if (done) {
    return (
      <div className="konverter-lead-done">
        <strong>Danke — wir melden uns werktags zeitnah.</strong>
        <p>Dein Preisrahmen ist bei uns eingegangen. Unverbindlich, Festpreis nach Besichtigung.</p>
      </div>
    );
  }

  return (
    <form className="konverter-lead-form konverter-lead-form--modal" onSubmit={handleSubmit}>
      <div className="konverter-lead-grid">
        <input
          type="text"
          className="funnel-input"
          placeholder="Vorname"
          value={vorname}
          onChange={(e) => setVorname(e.target.value)}
          autoComplete="given-name"
        />
        <input
          type="text"
          className="funnel-input"
          placeholder="Nachname"
          value={nachname}
          onChange={(e) => setNachname(e.target.value)}
          autoComplete="family-name"
        />
        <input
          type="text"
          className="funnel-input"
          placeholder="Straße"
          value={strasse}
          onChange={(e) => setStrasse(e.target.value)}
          autoComplete="street-address"
        />
        <input
          type="text"
          className="funnel-input"
          placeholder="Nr."
          value={hausnummer}
          onChange={(e) => setHausnummer(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className="funnel-input"
          placeholder="PLZ"
          value={plz}
          onChange={(e) => setPlz(e.target.value)}
          maxLength={5}
          autoComplete="postal-code"
        />
        <input
          type="text"
          className="funnel-input"
          placeholder="Ort"
          value={ort}
          onChange={(e) => setOrt(e.target.value)}
          autoComplete="address-level2"
        />
        <input
          type="email"
          className="funnel-input"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="tel"
          className="funnel-input"
          placeholder="Telefon"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <DatenschutzCheckbox checked={privacy} onChange={setPrivacy} />

      {error ? <p className="konverter-lead-error">{error}</p> : null}

      <button
        type="submit"
        className="page-hero-btn-primary konverter-lead-submit"
        disabled={loading}
      >
        {loading ? "Wird gesendet…" : "Kostenrahmen anfragen →"}
      </button>
    </form>
  );
}
