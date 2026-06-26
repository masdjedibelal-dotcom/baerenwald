"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import type { MeldeKategorie } from "@/lib/org/types";
import { track } from "@/lib/analytics";
import "./melden.css";

type Props = {
  orgName: string;
  orgLogoUrl?: string | null;
  objektTitel: string;
  objektAdresse?: string;
  objektPlzOrt?: string;
  einheitenHinweis?: string | null;
  orgKennung: string;
  objektSlug: string;
  mode?: "melden" | "ergaenzen";
  einladungToken?: string;
  prefill?: {
    name?: string;
    email?: string;
    telefon?: string;
    einheit?: string;
    beschreibung?: string;
  };
};

export function MeldeFormular({
  orgName,
  orgLogoUrl,
  objektTitel,
  objektAdresse,
  objektPlzOrt,
  einheitenHinweis,
  orgKennung,
  objektSlug,
  mode = "melden",
  einladungToken,
  prefill,
}: Props) {
  const router = useRouter();
  const [kategorie, setKategorie] = useState<MeldeKategorie>("reparatur");
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [telefon, setTelefon] = useState(prefill?.telefon ?? "");
  const [einheit, setEinheit] = useState(prefill?.einheit ?? "");
  const [beschreibung, setBeschreibung] = useState(prefill?.beschreibung ?? "");
  const [fotos, setFotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionKey = useMemo(
    () => `melde-${orgKennung}-${objektSlug}`,
    [orgKennung, objektSlug]
  );

  useEffect(() => {
    if (mode === "melden") {
      track.meldeLinkGeoeffnet(orgKennung, objektSlug);
    }
  }, [mode, orgKennung, objektSlug]);

  const uploadFoto = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.set("session_key", sessionKey);
      fd.set("file", file);
      const res = await fetch("/api/meldung/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload fehlgeschlagen");
      }
      setFotos((prev) => [...prev, json.url!]);
    },
    [sessionKey]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint =
        mode === "ergaenzen" ? "/api/meldung/ergaenzen" : "/api/meldung";
      const payload =
        mode === "ergaenzen"
          ? {
              token: einladungToken,
              name,
              email,
              telefon,
              einheit,
              kategorie,
              beschreibung,
              fotos,
            }
          : {
              org: orgKennung,
              objekt: objektSlug,
              name,
              email,
              telefon,
              einheit,
              kategorie,
              beschreibung,
              fotos,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Senden fehlgeschlagen.");
        return;
      }
      if (mode === "melden") {
        track.meldeAbgeschickt(kategorie, orgKennung);
      }
      router.push("/melden/bestaetigung");
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="melden-page">
      <div className="melden-shell">
        <div className="melden-brand">
          {orgLogoUrl ? (
            <Image src={orgLogoUrl} alt="" width={40} height={40} unoptimized />
          ) : null}
          <div>
            <p className="text-sm text-text-secondary">{orgName}</p>
            <h1 className="text-lg font-semibold text-text-primary">
              {mode === "ergaenzen" ? "Meldung ergänzen" : "Schaden melden"}
            </h1>
          </div>
        </div>

        <div className="melden-card">
          <p className="text-sm font-medium text-text-primary">{objektTitel}</p>
          {(objektAdresse || objektPlzOrt) && (
            <p className="text-sm text-text-secondary mt-0.5">
              {[objektAdresse, objektPlzOrt].filter(Boolean).join(" · ")}
            </p>
          )}
          {einheitenHinweis ? (
            <p className="text-xs text-text-tertiary mt-1">{einheitenHinweis}</p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-4">
            <p className="text-sm text-text-secondary mb-2">Was ist passiert?</p>
            <div className="melden-kategorie-grid">
              {MELDE_KATEGORIEN.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="melden-kategorie-btn"
                  data-active={kategorie === k.id}
                  data-dringend={k.dringend ? "true" : undefined}
                  onClick={() => setKategorie(k.id)}
                >
                  <span className="block font-medium text-sm">{k.label}</span>
                  <span className="block text-xs text-text-tertiary mt-0.5">
                    {k.hint}
                  </span>
                </button>
              ))}
            </div>

            <div className="melden-field">
              <label htmlFor="melder-name">Dein Name</label>
              <input
                id="melder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="melden-field">
              <label htmlFor="melder-einheit">Wohnung / Einheit (optional)</label>
              <input
                id="melder-einheit"
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                placeholder="z. B. Whg. 12, 2. OG links"
              />
            </div>

            <div className="melden-field">
              <label htmlFor="melder-email">E-Mail</label>
              <input
                id="melder-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="melden-field">
              <label htmlFor="melder-tel">Telefon (falls keine E-Mail)</label>
              <input
                id="melder-tel"
                type="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="melden-field">
              <label htmlFor="melder-text">Kurz beschreiben</label>
              <textarea
                id="melder-text"
                rows={4}
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                required
                minLength={8}
                placeholder="Was ist defekt? Seit wann?"
              />
            </div>

            <div className="melden-field">
              <label htmlFor="melder-fotos">Fotos (optional)</label>
              <p className="text-xs text-text-tertiary mb-1.5">
                Bitte nur schadensrelevante Aufnahmen — keine Familienfotos oder
                sonstige unnötige personenbezogene Inhalte.
              </p>
              <input
                id="melder-fotos"
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const f of files) {
                    try {
                      await uploadFoto(f);
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Upload fehlgeschlagen"
                      );
                    }
                  }
                  e.target.value = "";
                }}
              />
              {fotos.length > 0 ? (
                <div className="melden-photo-list">
                  {fotos.map((url) => (
                    <img key={url} src={url} alt="" className="melden-photo-thumb" />
                  ))}
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {error}
              </p>
            ) : null}

            <MeldeDatenschutzHinweis orgName={orgName} mode={mode} />

            <button type="submit" className="melden-submit" disabled={busy}>
              {busy ? "Wird gesendet…" : "Meldung absenden"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-tertiary mt-4">
          Koordination durch{" "}
          <Link href="/" className="underline">
            Bärenwald
          </Link>
          . Kein Preis — wir melden uns.
        </p>
      </div>
    </div>
  );
}
