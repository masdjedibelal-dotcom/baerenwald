"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import { MELDE_BEREICHE, type MeldeBereichId } from "@/lib/org/melde-bereiche";
import { getMeldeFachdetailQuestions } from "@/lib/org/melde-fachdetails";
import type { MeldeKategorie } from "@/lib/org/types";
import { track } from "@/lib/analytics";
import "./melden.css";

type Props = {
  orgName: string;
  orgLogoUrl?: string | null;
  objektTitel: string;
  objektAdresse?: string;
  objektPlzOrt?: string;
  objektPlz?: string;
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

type Step = "kategorie" | "bereich" | "fachdetail" | "details" | "kontakt";

export function MeldeFormular({
  orgName,
  orgLogoUrl,
  objektTitel,
  objektAdresse,
  objektPlzOrt,
  objektPlz = "",
  einheitenHinweis,
  orgKennung,
  objektSlug,
  mode = "melden",
  einladungToken,
  prefill,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("kategorie");
  const [kategorie, setKategorie] = useState<MeldeKategorie>("reparatur");
  const [bereichId, setBereichId] = useState<MeldeBereichId>("wasser");
  const [fachdetailAnswers, setFachdetailAnswers] = useState<
    Record<string, string>
  >({});
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [telefon, setTelefon] = useState(prefill?.telefon ?? "");
  const [einheit, setEinheit] = useState(prefill?.einheit ?? "");
  const [beschreibung, setBeschreibung] = useState(prefill?.beschreibung ?? "");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const sessionKey = useMemo(
    () => `melde-${orgKennung}-${objektSlug}`,
    [orgKennung, objektSlug]
  );

  useEffect(() => {
    if (mode === "melden") {
      track.meldeLinkGeoeffnet(orgKennung, objektSlug);
    }
  }, [mode, orgKennung, objektSlug]);

  const fachQuestions = useMemo(
    () =>
      getMeldeFachdetailQuestions({
        kategorie,
        bereichId,
        plz: objektPlz || "80331",
        fachdetailAnswers,
      }),
    [kategorie, bereichId, objektPlz, fachdetailAnswers]
  );

  const uploadFoto = useCallback(
    async (file: File): Promise<string> => {
      const fd = new FormData();
      fd.set("session_key", sessionKey);
      fd.set("file", file);
      const res = await fetch("/api/meldung/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload fehlgeschlagen");
      }
      return json.url;
    },
    [sessionKey]
  );

  const goNextFromBereich = () => {
    if (fachQuestions.length > 0) setStep("fachdetail");
    else setStep("details");
  };

  const goNextFromFachdetail = () => {
    for (const q of fachQuestions) {
      if (!fachdetailAnswers[q.id]?.trim()) {
        setError("Bitte alle Fragen beantworten.");
        return;
      }
    }
    setError(null);
    setStep("details");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fotos: string[] = [];
      for (const f of photoFiles) {
        fotos.push(await uploadFoto(f));
      }

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
              bereichId,
              fachdetailAnswers,
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
              bereichId,
              fachdetailAnswers,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
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

          {step === "kategorie" ? (
            <div className="mt-4">
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
              <button
                type="button"
                className="melden-submit"
                onClick={() => setStep("bereich")}
              >
                Weiter
              </button>
            </div>
          ) : null}

          {step === "bereich" ? (
            <div className="mt-4">
              <p className="text-sm text-text-secondary mb-1">Was ist betroffen?</p>
              <p className="text-xs text-text-tertiary mb-2">
                Bitte das Passendste wählen.
              </p>
              <div className="melden-kategorie-grid">
                {MELDE_BEREICHE.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="melden-kategorie-btn"
                    data-active={bereichId === b.id}
                    onClick={() => setBereichId(b.id)}
                  >
                    <span className="block font-medium text-sm">{b.label}</span>
                    <span className="block text-xs text-text-tertiary mt-0.5">
                      {b.hint}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                  onClick={() => setStep("kategorie")}
                >
                  Zurück
                </button>
                <button type="button" className="melden-submit flex-1" onClick={goNextFromBereich}>
                  Weiter
                </button>
              </div>
            </div>
          ) : null}

          {step === "fachdetail" ? (
            <div className="mt-4 space-y-3">
              {fachQuestions.map((q) => (
                <div key={q.id} className="melden-field !mt-0">
                  <label>{q.frage}</label>
                  {q.subtext ? (
                    <p className="text-xs text-text-tertiary">{q.subtext}</p>
                  ) : null}
                  <div className="flex flex-col gap-1.5 mt-1">
                    {q.optionen.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className="melden-kategorie-btn !py-2"
                        data-active={fachdetailAnswers[q.id] === o.value}
                        onClick={() =>
                          setFachdetailAnswers((prev) => ({
                            ...prev,
                            [q.id]: o.value,
                          }))
                        }
                      >
                        <span className="block text-sm font-medium">{o.label}</span>
                        {o.hint ? (
                          <span className="block text-xs text-text-tertiary">
                            {o.hint}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                  onClick={() => setStep("bereich")}
                >
                  Zurück
                </button>
                <button type="button" className="melden-submit flex-1" onClick={goNextFromFachdetail}>
                  Weiter
                </button>
              </div>
            </div>
          ) : null}

          {step === "details" || step === "kontakt" ? (
            <form onSubmit={onSubmit} className="mt-4">
              {step === "details" ? (
                <>
                  <div className="melden-field">
                    <label htmlFor="melder-text">Was ist passiert?</label>
                    <textarea
                      id="melder-text"
                      rows={4}
                      value={beschreibung}
                      onChange={(e) => setBeschreibung(e.target.value)}
                      required
                      minLength={8}
                      placeholder="z. B. tropfender Hahn im Bad, seit gestern"
                    />
                  </div>
                  <PhotoUpload
                    files={photoFiles}
                    onChange={setPhotoFiles}
                    buttonTitle="Fotos hochladen"
                    buttonHint="Nur vom Schaden — keine Personen."
                    showCompareOfferHint={false}
                    className="mt-3"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                      onClick={() =>
                        setStep(fachQuestions.length ? "fachdetail" : "bereich")
                      }
                    >
                      Zurück
                    </button>
                    <button
                      type="button"
                      className="melden-submit flex-1"
                      onClick={() => {
                        if (beschreibung.length < 8) {
                          setError("Bitte kurz beschreiben (mind. 8 Zeichen).");
                          return;
                        }
                        setError(null);
                        setStep("kontakt");
                      }}
                    >
                      Weiter
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                    <label htmlFor="melder-einheit">Wohnung / Einheit</label>
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
                  <button
                    type="button"
                    className="text-xs text-accent mt-2 underline"
                    onClick={() => setPrivacyOpen((v) => !v)}
                  >
                    {privacyOpen ? "Datenschutz ausblenden" : "Datenschutzhinweis anzeigen"}
                  </button>
                  {privacyOpen ? (
                    <MeldeDatenschutzHinweis orgName={orgName} mode={mode} />
                  ) : null}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                      onClick={() => setStep("details")}
                    >
                      Zurück
                    </button>
                    <button type="submit" className="melden-submit flex-1" disabled={busy}>
                      {busy ? "Wird gesendet…" : "Meldung absenden"}
                    </button>
                  </div>
                </>
              )}
              {error ? (
                <p className="text-sm text-red-600 mt-3" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>

        <p className="text-center text-xs text-text-tertiary mt-4">
          Bearbeitung durch {orgName} und{" "}
          <Link href="/" className="underline">
            Bärenwald
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
