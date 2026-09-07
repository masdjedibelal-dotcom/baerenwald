"use client";

import { useState } from "react";

import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { MELDE_BEREICHE } from "@/lib/org/melde-bereiche";
import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import type { MeldeKategorie, OrganisationObjekt } from "@/lib/org/types";

type Mode = "direkt" | "einladen";

type Props = {
  objekte: OrganisationObjekt[];
  mode: Mode;
  onDone: () => void;
};

const MAX_FOTOS = 12;

async function uploadHvMeldungFotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files.slice(0, MAX_FOTOS)) {
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch("/api/org/meldung-upload", {
      method: "POST",
      body: fd,
    });
    if (res.status === 413) {
      throw new Error("Datei zu groß (max. 8 MB)");
    }
    let json: { url?: string; error?: string } = {};
    try {
      json = (await res.json()) as { url?: string; error?: string };
    } catch {
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
    }
    if (!res.ok || !json.url) {
      throw new Error(json.error ?? "Upload fehlgeschlagen");
    }
    urls.push(json.url);
  }
  return urls;
}

export function OrganisationMeldungErfassenForm({ objekte, mode, onDone }: Props) {
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [melderName, setMelderName] = useState("");
  const [melderEmail, setMelderEmail] = useState("");
  const [melderTelefon, setMelderTelefon] = useState("");
  const [melderEinheit, setMelderEinheit] = useState("");
  const [kategorie, setKategorie] = useState<MeldeKategorie>("reparatur");
  const [bereichId, setBereichId] = useState("wasser");
  const [beschreibung, setBeschreibung] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [versicherung, setVersicherung] = useState(false);
  const [versicherungsNr, setVersicherungsNr] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setLink(null);
    try {
      let fotos: string[] = [];
      if (mode === "direkt" && photos.length > 0) {
        try {
          fotos = await uploadHvMeldungFotos(photos);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Foto-Upload fehlgeschlagen";
          setMessage(msg);
          portalToastError("Upload fehlgeschlagen", msg);
          return;
        }
      }

      const endpoint =
        mode === "direkt" ? "/api/org/meldung-direkt" : "/api/org/meldung-vorab";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId,
          melderName,
          melderEmail,
          melderTelefon,
          melderEinheit,
          kategorie,
          bereichId,
          beschreibung,
          ...(mode === "direkt"
            ? {
                fotos,
                versicherung,
                versicherungsNr: versicherung
                  ? versicherungsNr || undefined
                  : undefined,
              }
            : {}),
        }),
      });
      const json = (await res.json()) as { error?: string; link?: string };
      if (!res.ok) {
        setMessage(json.error ?? "Fehler");
        return;
      }
      if (mode === "einladen") {
        setLink(json.link ?? null);
        setMessage("Einladung erstellt.");
        orgPortalToast.einladungErstellt();
      } else {
        setMessage("Meldung erfasst — sie erscheint unter Meldungen.");
        orgPortalToast.meldungErfasst();
        setTimeout(onDone, 1200);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-sm text-text-secondary">
        {mode === "direkt"
          ? "Telefonische oder schriftliche Meldung direkt erfassen (ohne Mieter-Link)."
          : "Mieter per Link einladen, Details und Fotos selbst ergänzen zu lassen."}
      </p>
      <div>
        <label className="text-sm text-text-secondary">Objekt</label>
        <select
          className="w-full mt-1 border rounded-lg px-3 py-2"
          value={objektId}
          onChange={(e) => setObjektId(e.target.value)}
          required
        >
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titel}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-text-secondary">Was ist passiert?</label>
        <select
          className="w-full mt-1 border rounded-lg px-3 py-2"
          value={kategorie}
          onChange={(e) => setKategorie(e.target.value as MeldeKategorie)}
        >
          {MELDE_KATEGORIEN.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-text-secondary">Was ist betroffen?</label>
        <select
          className="w-full mt-1 border rounded-lg px-3 py-2"
          value={bereichId}
          onChange={(e) => setBereichId(e.target.value)}
        >
          {MELDE_BEREICHE.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Name Melder"
        value={melderName}
        onChange={(e) => setMelderName(e.target.value)}
        required
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="E-Mail Melder"
        type="email"
        value={melderEmail}
        onChange={(e) => setMelderEmail(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Telefon"
        value={melderTelefon}
        onChange={(e) => setMelderTelefon(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Einheit"
        value={melderEinheit}
        onChange={(e) => setMelderEinheit(e.target.value)}
      />
      <textarea
        className="w-full border rounded-lg px-3 py-2"
        rows={3}
        placeholder="Beschreibung (mind. 8 Zeichen)"
        value={beschreibung}
        onChange={(e) => setBeschreibung(e.target.value)}
        required
        minLength={8}
      />
      {mode === "direkt" ? (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            Fotos vom Schaden{" "}
            <span className="text-text-tertiary">(optional, max. {MAX_FOTOS})</span>
          </p>
          <PhotoUpload
            files={photos}
            onChange={setPhotos}
            maxFiles={MAX_FOTOS}
            buttonTitle="Fotos hinzufügen"
            buttonHint="Schadenfotos vom Melder oder vor Ort — optional"
          />
        </div>
      ) : null}
      {mode === "direkt" ? (
        <div className="space-y-2 rounded-xl border border-border-default bg-muted/30 p-3">
          <p className="text-sm font-medium text-text-secondary">
            Abrechnung über Versicherung?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVersicherung(true)}
              className={
                versicherung
                  ? "btn-pill-primary portal-btn-compact"
                  : "btn-pill-outline portal-btn-compact"
              }
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => setVersicherung(false)}
              className={
                !versicherung
                  ? "btn-pill-primary portal-btn-compact"
                  : "btn-pill-outline portal-btn-compact"
              }
            >
              Nein
            </button>
          </div>
          <p className="text-xs text-text-tertiary">
            Bei Ja erstellen wir die Schadenakte automatisch für die Einreichung.
          </p>
          {versicherung ? (
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Versicherungsnummer (optional)"
              value={versicherungsNr}
              onChange={(e) => setVersicherungsNr(e.target.value)}
            />
          ) : null}
        </div>
      ) : null}
      {mode === "einladen" ? (
        <p className="text-xs text-text-tertiary rounded-lg bg-muted/30 p-2">
          Bitte Melderdaten nur übermitteln, wenn eine rechtliche Grundlage
          vorliegt. Die betroffene Person muss über die Datenverarbeitung
          informiert werden.
        </p>
      ) : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {link ? (
        <p className="text-xs break-all text-text-tertiary">Link: {link}</p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className="btn-pill-outline flex-1" onClick={onDone}>
          Schließen
        </button>
        <button type="submit" className="btn-pill-primary flex-1" disabled={busy}>
          {mode === "direkt"
            ? busy
              ? photos.length > 0
                ? "Fotos & Meldung…"
                : "Speichern…"
              : "Meldung speichern"
            : busy
              ? "Senden…"
              : "Einladung senden"}
        </button>
      </div>
    </form>
  );
}
