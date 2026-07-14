"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { meldeT, type MeldeLang } from "@/lib/melden/melde-i18n";
import { orgMieterKontaktKurz } from "@/lib/org/org-mieter-kontakt";
import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import { MELDE_BEREICHE, type MeldeBereichId } from "@/lib/org/melde-bereiche";
import { getMeldeFachdetailQuestions } from "@/lib/org/melde-fachdetails";
import type { MeldeKategorie } from "@/lib/org/types";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import "./melden.css";

type Props = {
  orgName: string;
  orgLogoUrl?: string | null;
  mieterKontaktTelefon?: string | null;
  mieterKontaktEmail?: string | null;
  mieterKontaktHinweis?: string | null;
  objektTitel: string;
  objektAdresse?: string;
  objektPlzOrt?: string;
  objektPlz?: string;
  einheitenHinweis?: string | null;
  orgKennung: string;
  objektSlug: string;
  datenschutzHref?: string;
  impressumHref?: string;
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

type Step =
  | "kategorie"
  | "bereich"
  | "fachdetail"
  | "beschreibung"
  | "medien"
  | "verfuegbarkeit"
  | "kontakt";

const VERFUEGBARKEIT_OPTIONS = [
  { id: "sofort", de: "So bald wie möglich", en: "As soon as possible" },
  { id: "diese_woche", de: "Diese Woche", en: "This week" },
  { id: "flexibel", de: "Flexibel", en: "Flexible" },
] as const;

export function MeldeFormular({
  orgName,
  orgLogoUrl,
  mieterKontaktTelefon,
  mieterKontaktEmail,
  mieterKontaktHinweis,
  objektTitel,
  objektAdresse,
  objektPlzOrt,
  objektPlz = "",
  einheitenHinweis,
  orgKennung,
  objektSlug,
  datenschutzHref,
  impressumHref,
  mode = "melden",
  einladungToken,
  prefill,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<MeldeLang>("de");
  const [step, setStep] = useState<Step>("kategorie");
  const [fachdetailIdx, setFachdetailIdx] = useState(0);
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [dringlichkeit, setDringlichkeit] = useState<string | null>(null);

  const orgKontakt = useMemo(
    () => ({
      org_anzeigename: orgName,
      name: orgName,
      mieter_kontakt_telefon: mieterKontaktTelefon,
      mieter_kontakt_email: mieterKontaktEmail,
      mieter_kontakt_hinweis: mieterKontaktHinweis,
    }),
    [
      orgName,
      mieterKontaktTelefon,
      mieterKontaktEmail,
      mieterKontaktHinweis,
    ]
  );

  const footerKurz = orgMieterKontaktKurz(orgKontakt, lang);

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

  const uploadMedia = useCallback(
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
    setFachdetailIdx(0);
    if (fachQuestions.length > 0) setStep("fachdetail");
    else setStep("beschreibung");
  };

  const goNextFromFachdetail = () => {
    const q = fachQuestions[fachdetailIdx];
    if (!fachdetailAnswers[q.id]?.trim()) {
      setError(lang === "de" ? "Bitte eine Option wählen." : "Please choose an option.");
      return;
    }
    setError(null);
    if (fachdetailIdx < fachQuestions.length - 1) {
      setFachdetailIdx((i) => i + 1);
    } else {
      setStep("beschreibung");
    }
  };

  const goBackFromFachdetail = () => {
    if (fachdetailIdx > 0) {
      setFachdetailIdx((i) => i - 1);
    } else {
      setStep("bereich");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fotos: string[] = [];
      for (const f of photoFiles) {
        fotos.push(await uploadMedia(f));
      }
      if (videoFile) {
        fotos.push(await uploadMedia(videoFile));
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
              ...(dringlichkeit ? { dringlichkeit } : {}),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        statusLink?: string;
        meldeTrackingToken?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Senden fehlgeschlagen.");
        return;
      }
      if (mode === "melden") {
        track.meldeAbgeschickt(kategorie, orgKennung);
      }
      const q = new URLSearchParams({ org: orgName });
      if (json.statusLink) q.set("statusLink", json.statusLink);
      else if (json.meldeTrackingToken) q.set("token", json.meldeTrackingToken);
      router.push(`/melden/bestaetigung?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  };

  const currentFachQuestion = fachQuestions[fachdetailIdx];

  return (
    <div className="melden-page">
      <div className="melden-shell">
        <div className="melden-brand">
          {orgLogoUrl ? (
            <Image src={orgLogoUrl} alt="" width={40} height={40} unoptimized />
          ) : null}
          <div className="flex-1">
            <p className="text-sm text-text-secondary">{orgName}</p>
            <h1 className="text-lg font-semibold text-text-primary">
              {mode === "ergaenzen"
                ? meldeT(lang, "ergaenzen")
                : meldeT(lang, "melden")}
            </h1>
          </div>
          <div className="flex rounded-lg border border-[#d9e3dd] overflow-hidden text-xs font-semibold">
            <button
              type="button"
              className={lang === "de" ? "bg-[#1a3d2b] text-white px-2.5 py-1" : "px-2.5 py-1"}
              onClick={() => setLang("de")}
            >
              DE
            </button>
            <button
              type="button"
              className={lang === "en" ? "bg-[#1a3d2b] text-white px-2.5 py-1" : "px-2.5 py-1"}
              onClick={() => setLang("en")}
            >
              EN
            </button>
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
              <p className="text-sm text-text-secondary mb-2">
                {meldeT(lang, "wasPassiert")}
              </p>
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
                {meldeT(lang, "weiter")}
              </button>
            </div>
          ) : null}

          {step === "bereich" ? (
            <div className="mt-4">
              <p className="text-sm text-text-secondary mb-1">
                {meldeT(lang, "wasBetroffen")}
              </p>
              <p className="text-xs text-text-tertiary mb-2">
                {meldeT(lang, "waehlen")}
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
                  {meldeT(lang, "zurueck")}
                </button>
                <button type="button" className="melden-submit flex-1" onClick={goNextFromBereich}>
                  {meldeT(lang, "weiter")}
                </button>
              </div>
            </div>
          ) : null}

          {step === "fachdetail" && currentFachQuestion ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-text-tertiary">
                {fachdetailIdx + 1} / {fachQuestions.length}
              </p>
              <div className="melden-field !mt-0">
                <label>{currentFachQuestion.frage}</label>
                {currentFachQuestion.subtext ? (
                  <p className="text-xs text-text-tertiary">{currentFachQuestion.subtext}</p>
                ) : null}
                <div className="flex flex-col gap-1.5 mt-1">
                  {currentFachQuestion.optionen.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className="melden-kategorie-btn !py-2"
                      data-active={fachdetailAnswers[currentFachQuestion.id] === o.value}
                      onClick={() =>
                        setFachdetailAnswers((prev) => ({
                          ...prev,
                          [currentFachQuestion.id]: o.value,
                        }))
                      }
                    >
                      <span className="block text-sm font-medium">{o.label}</span>
                      {o.hint ? (
                        <span className="block text-xs text-text-tertiary">{o.hint}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                  onClick={goBackFromFachdetail}
                >
                  {meldeT(lang, "zurueck")}
                </button>
                <button type="button" className="melden-submit flex-1" onClick={goNextFromFachdetail}>
                  {meldeT(lang, "weiter")}
                </button>
              </div>
            </div>
          ) : null}

          {step === "beschreibung" || step === "medien" || step === "verfuegbarkeit" || step === "kontakt" ? (
            <form onSubmit={onSubmit} className="mt-4">
              {step === "beschreibung" ? (
                <>
                  <div className="melden-field">
                    <label htmlFor="melder-text">{meldeT(lang, "beschreibung")}</label>
                    <textarea
                      id="melder-text"
                      rows={4}
                      value={beschreibung}
                      onChange={(e) => setBeschreibung(e.target.value)}
                      required
                      minLength={8}
                      placeholder={meldeT(lang, "beschreibungPh")}
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                      onClick={() => {
                        setFachdetailIdx(fachQuestions.length - 1);
                        setStep(fachQuestions.length ? "fachdetail" : "bereich");
                      }}
                    >
                      {meldeT(lang, "zurueck")}
                    </button>
                    <button
                      type="button"
                      className="melden-submit flex-1"
                      onClick={() => {
                        if (beschreibung.length < 8) {
                          setError(
                            lang === "de"
                              ? "Bitte kurz beschreiben (mind. 8 Zeichen)."
                              : "Please describe (min. 8 characters)."
                          );
                          return;
                        }
                        setError(null);
                        setStep("medien");
                      }}
                    >
                      {meldeT(lang, "weiter")}
                    </button>
                  </div>
                </>
              ) : step === "medien" ? (
                <>
                  <PhotoUpload
                    files={photoFiles}
                    onChange={setPhotoFiles}
                    buttonTitle={meldeT(lang, "fotos")}
                    buttonHint={
                      lang === "de"
                        ? "Nur vom Schaden — keine Personen."
                        : "Damage only — no people."
                    }
                    showCompareOfferHint={false}
                    className="mt-1"
                  />
                  <div className="melden-field mt-4">
                    <label htmlFor="melder-video">{meldeT(lang, "video")}</label>
                    <p className="text-xs text-text-tertiary mb-2">
                      {meldeT(lang, "videoHint")}
                    </p>
                    <input
                      id="melder-video"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      capture="environment"
                      onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                      className="text-sm"
                    />
                    {videoFile ? (
                      <p className="text-xs text-text-secondary mt-1">{videoFile.name}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                      onClick={() => setStep("beschreibung")}
                    >
                      {meldeT(lang, "zurueck")}
                    </button>
                    <button
                      type="button"
                      className="melden-submit flex-1"
                      onClick={() => {
                        setError(null);
                        setStep("verfuegbarkeit");
                      }}
                    >
                      {meldeT(lang, "weiter")}
                    </button>
                  </div>
                </>
              ) : step === "verfuegbarkeit" ? (
                <>
                  <p className="text-sm text-text-secondary">{meldeT(lang, "verfuegbarkeitHint")}</p>
                  <div className="space-y-2 mt-3">
                    {VERFUEGBARKEIT_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm",
                          dringlichkeit === opt.id
                            ? "border-[#1a3d2b] bg-[#f0f7f3]"
                            : "border-[#d9e3dd]"
                        )}
                      >
                        <input
                          type="radio"
                          name="verfuegbarkeit"
                          checked={dringlichkeit === opt.id}
                          onChange={() => setDringlichkeit(opt.id)}
                        />
                        {lang === "de" ? opt.de : opt.en}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                        onClick={() => setStep("medien")}
                      >
                        {meldeT(lang, "zurueck")}
                      </button>
                      <button
                        type="button"
                        className="melden-submit flex-1"
                        onClick={() => {
                          setError(null);
                          setStep("kontakt");
                        }}
                      >
                        {meldeT(lang, "weiter")}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-text-tertiary underline"
                      onClick={() => {
                        setDringlichkeit(null);
                        setError(null);
                        setStep("kontakt");
                      }}
                    >
                      {meldeT(lang, "verfuegbarkeitSkip")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="melden-field">
                    <label htmlFor="melder-name">{meldeT(lang, "name")}</label>
                    <input
                      id="melder-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="melden-field">
                    <label htmlFor="melder-einheit">{meldeT(lang, "einheit")}</label>
                    <input
                      id="melder-einheit"
                      value={einheit}
                      onChange={(e) => setEinheit(e.target.value)}
                      placeholder={meldeT(lang, "einheitPh")}
                    />
                  </div>
                  <div className="melden-field">
                    <label htmlFor="melder-email">{meldeT(lang, "email")}</label>
                    <input
                      id="melder-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="melden-field">
                    <label htmlFor="melder-tel">{meldeT(lang, "tel")}</label>
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
                    {privacyOpen
                      ? lang === "de"
                        ? "Datenschutz ausblenden"
                        : "Hide privacy notice"
                      : lang === "de"
                        ? "Datenschutzhinweis anzeigen"
                        : "Show privacy notice"}
                  </button>
                  {privacyOpen ? (
                    <MeldeDatenschutzHinweis
                      orgName={orgName}
                      mode={mode}
                      datenschutzHref={datenschutzHref}
                      impressumHref={impressumHref}
                    />
                  ) : null}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
                      onClick={() => setStep("verfuegbarkeit")}
                    >
                      {meldeT(lang, "zurueck")}
                    </button>
                    <button type="submit" className="melden-submit flex-1" disabled={busy}>
                      {busy ? meldeT(lang, "sending") : meldeT(lang, "senden")}
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

        <p className="text-center text-xs text-text-tertiary mt-4">{footerKurz}</p>
      </div>
    </div>
  );
}
