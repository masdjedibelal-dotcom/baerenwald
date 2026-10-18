"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { MieterWlBtn } from "@/components/melden/MieterWlFrame";
import { PortalField } from "@/components/shared/PortalField";
import { PortalCheckbox, PortalInput, PortalTextarea } from "@/components/shared/PortalFormControls";
import { ladeAnfrageFotosHoch } from "@/lib/funnel/fotos-hochladen";

type Props = {
  orgName: string;
  orgKennung: string;
  objektSlug: string;
  /** Objekt-Link: Adresse steht fest — sonst fragt das Formular sie ab */
  objektTitel?: string | null;
  objektAdresse?: string | null;
  adresse: { strasse: string; hausnummer: string; plz: string; ort: string };
  adresseNoetig: boolean;
  datenschutzHref?: string;
  impressumHref?: string;
};

const MAX_FOTOS = 6;

/**
 * Bärenwald: einfache Schadenmeldung per Link — eine Seite statt Ursachen-Baum.
 * Landet direkt als Anfrage beim Team, die Verwaltung bekommt eine Info.
 */
export function MeldeEinfachFormular({
  orgName,
  orgKennung,
  objektSlug,
  objektTitel,
  objektAdresse,
  adresse,
  adresseNoetig,
  datenschutzHref,
  impressumHref,
}: Props) {
  const router = useRouter();
  const [einheit, setEinheit] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [strasse, setStrasse] = useState(adresse.strasse);
  const [hausnummer, setHausnummer] = useState(adresse.hausnummer);
  const [plz, setPlz] = useState(adresse.plz);
  const [ort, setOrt] = useState(adresse.ort);
  const [datenschutz, setDatenschutz] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  function pruefe(): string | null {
    if (beschreibung.trim().length < 10) return "Bitte beschreiben Sie kurz, was passiert ist.";
    if (name.trim().length < 2) return "Bitte geben Sie Ihren Namen an.";
    if (!email.trim() && telefon.trim().length < 6) return "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
    if (adresseNoetig) {
      if (!strasse.trim() || !hausnummer.trim()) return "Bitte geben Sie Straße und Hausnummer an.";
      if (!/^\d{5}$/.test(plz.trim())) return "Bitte geben Sie eine gültige PLZ an.";
    }
    if (!datenschutz) return "Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.";
    return null;
  }

  async function absenden() {
    const f = pruefe();
    setFehler(f);
    if (f || busy) return;
    setBusy(true);
    try {
      const { urls } = await ladeAnfrageFotosHoch(dateien, `melde-${orgKennung}-${objektSlug}`, MAX_FOTOS);
      const res = await fetch("/api/meldung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: orgKennung,
          objekt: objektSlug,
          name: name.trim(),
          email: email.trim(),
          telefon: telefon.trim() || undefined,
          einheit: einheit.trim() || undefined,
          kategorie: "reparatur",
          beschreibung: beschreibung.trim(),
          fotos: urls,
          dringlichkeit: "diese_woche",
          plz: plz.trim(),
          strasse: strasse.trim(),
          hausnummer: hausnummer.trim() || undefined,
          ort: ort.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string; meldeTrackingToken?: string };
      if (!res.ok) {
        setFehler(json.error ?? "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.");
        return;
      }
      const q = new URLSearchParams({ org: orgName, kennung: orgKennung, name: name.trim() });
      if (json.meldeTrackingToken) q.set("token", json.meldeTrackingToken);
      if (json.id?.trim()) q.set("ref", json.id.trim().slice(0, 8).toUpperCase());
      if (email.trim()) q.set("email", email.trim());
      if (telefon.trim()) q.set("telefon", telefon.trim());
      router.push(`/melden/bestaetigung?${q.toString()}`);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="melde-einfach"
      onSubmit={(e) => {
        e.preventDefault();
        void absenden();
      }}
      noValidate
    >
      <h1 className="melde-einfach__titel">Schaden melden</h1>
      {objektTitel ? (
        <p className="melde-einfach__objekt">
          {objektTitel}
          {objektAdresse ? <span> · {objektAdresse}</span> : null}
        </p>
      ) : null}

      <PortalField label="Wohnung / Lage (optional)">
        <PortalInput
          value={einheit}
          onChange={(e) => setEinheit(e.target.value)}
          placeholder="z. B. 2. OG links, Treppenhaus, Keller"
        />
      </PortalField>

      <PortalField label="Was ist passiert?" required>
        <PortalTextarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={5}
          placeholder="Bitte kurz beschreiben — seit wann, wo genau, was Sie beobachten."
        />
      </PortalField>

      <PortalField label={`Fotos oder Videos (optional, bis ${MAX_FOTOS})`}>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, MAX_FOTOS))}
        />
      </PortalField>
      {dateien.length ? (
        <p className="melde-einfach__hinweis">
          {dateien.length} {dateien.length === 1 ? "Datei" : "Dateien"} ausgewählt
        </p>
      ) : null}

      {adresseNoetig ? (
        <div className="melde-einfach__reihe">
          <PortalField label="Straße" required>
            <PortalInput value={strasse} onChange={(e) => setStrasse(e.target.value)} autoComplete="address-line1" />
          </PortalField>
          <PortalField label="Nr." required>
            <PortalInput value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} />
          </PortalField>
          <PortalField label="PLZ" required>
            <PortalInput value={plz} onChange={(e) => setPlz(e.target.value)} inputMode="numeric" autoComplete="postal-code" />
          </PortalField>
          <PortalField label="Ort">
            <PortalInput value={ort} onChange={(e) => setOrt(e.target.value)} autoComplete="address-level2" />
          </PortalField>
        </div>
      ) : null}

      <PortalField label="Ihr Name" required>
        <PortalInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </PortalField>
      <PortalField label="E-Mail">
        <PortalInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </PortalField>
      <PortalField label="Telefon">
        <PortalInput type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" />
      </PortalField>

      <MeldeDatenschutzHinweis orgName={orgName} datenschutzHref={datenschutzHref} impressumHref={impressumHref} />
      <label className="melde-einfach__zustimmung">
        <PortalCheckbox checked={datenschutz} onChange={(e) => setDatenschutz(e.target.checked)} />
        <span>Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung der Meldung zu.</span>
      </label>

      {fehler ? (
        <p className="melde-einfach__fehler" role="alert">
          {fehler}
        </p>
      ) : null}

      <MieterWlBtn type="submit" disabled={busy}>
        {busy ? "Wird gesendet …" : "Meldung absenden"}
      </MieterWlBtn>
    </form>
  );
}
