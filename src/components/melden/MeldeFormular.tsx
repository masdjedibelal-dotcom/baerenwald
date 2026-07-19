"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import {
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import { meldeT, type MeldeLang } from "@/lib/melden/melde-i18n";
import { orgMieterKontaktKurz } from "@/lib/org/org-mieter-kontakt";
import { MELDE_KATEGORIEN } from "@/lib/org/melde-kategorien";
import { MELDE_BEREICHE, type MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";
import { track } from "@/lib/analytics";
import {
  buildFachfragenLeadPayload,
  fachfrageLabel,
  getFachfragenForBereich,
} from "@/lib/portal2/fachfragen";
import {
  MELDE_FUNNEL_INTRO,
  MELDE_FUNNEL_STEPS,
  MELDE_NOTFALL_OPTIONS,
  createNext,
  createStepError,
  createStepValid,
  meldeFunnelTitle,
  type MeldeFunnelDraft,
  type MeldeFunnelStepId,
} from "@/lib/portal2/melde-funnel";
import {
  MELDE_TERMIN_QUALITATIV,
  buildUpcomingMeldeSlotOptions,
} from "@/lib/portal2/melde-slots";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";
import "./melden.css";

type Props = {
  orgName: string;
  orgLogoUrl?: string | null;
  orgLogoKuerzel?: string | null;
  orgSub?: string | null;
  orgPrimaryColor?: string | null;
  orgPrimaryColorDk?: string | null;
  orgPrimaryColorSoft?: string | null;
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

function draftFromState(input: {
  objektLabel: string;
  einheit: string;
  bereichId: MeldeBereichId | null;
  kategorie: MeldeKategorie | null;
  fachdetailAnswers: Record<string, string>;
  notfall: boolean | undefined;
  beschreibung: string;
  name: string;
  email: string;
  telefon: string;
  regelnAccepted: boolean;
  terminwunsch: string | null;
}): MeldeFunnelDraft {
  return {
    objekt: input.objektLabel,
    einheit: input.einheit,
    bereichId: input.bereichId,
    kategorie: input.kategorie,
    fachdetailAnswers: input.fachdetailAnswers,
    notfall: input.notfall,
    beschreibung: input.beschreibung,
    name: input.name,
    email: input.email,
    telefon: input.telefon,
    regelnAccepted: input.regelnAccepted,
    terminwunsch: input.terminwunsch,
  };
}

export function MeldeFormular({
  orgName,
  orgLogoUrl,
  orgLogoKuerzel,
  orgSub,
  orgPrimaryColor,
  orgPrimaryColorDk,
  orgPrimaryColorSoft,
  mieterKontaktTelefon,
  mieterKontaktEmail,
  mieterKontaktHinweis,
  objektTitel,
  objektAdresse,
  objektPlzOrt,
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
  const steps = MELDE_FUNNEL_STEPS;
  const objektLabel = [objektTitel, objektAdresse, objektPlzOrt]
    .filter(Boolean)
    .join(" · ");

  const [lang, setLang] = useState<MeldeLang>("de");
  const [createStep, setCreateStep] = useState(0);
  const [kategorie, setKategorie] = useState<MeldeKategorie | null>(null);
  const [bereichId, setBereichId] = useState<MeldeBereichId | null>(null);
  const [fachdetailAnswers, setFachdetailAnswers] = useState<
    Record<string, string>
  >({});
  const [notfall, setNotfall] = useState<boolean | undefined>(undefined);
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [telefon, setTelefon] = useState(prefill?.telefon ?? "");
  const [einheit, setEinheit] = useState(prefill?.einheit ?? "");
  const [beschreibung, setBeschreibung] = useState(
    prefill?.beschreibung ?? ""
  );
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [regelnAccepted, setRegelnAccepted] = useState(false);
  const [terminwunsch, setTerminwunsch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepId = steps[createStep]?.[0] ?? "objekt";

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

  const terminSlots = useMemo(() => buildUpcomingMeldeSlotOptions(3), []);

  const fachQuestions = useMemo(
    () => getFachfragenForBereich(bereichId ?? "sonstiges"),
    [bereichId]
  );

  useEffect(() => {
    if (mode === "melden") {
      track.meldeLinkGeoeffnet(orgKennung, objektSlug);
    }
  }, [mode, orgKennung, objektSlug]);

  const currentDraft = useMemo(
    () =>
      draftFromState({
        objektLabel,
        einheit,
        bereichId,
        kategorie,
        fachdetailAnswers,
        notfall,
        beschreibung,
        name,
        email,
        telefon,
        regelnAccepted,
        terminwunsch,
      }),
    [
      objektLabel,
      einheit,
      bereichId,
      kategorie,
      fachdetailAnswers,
      notfall,
      beschreibung,
      name,
      email,
      telefon,
      regelnAccepted,
      terminwunsch,
    ]
  );

  const stepOk = createStepValid(stepId, currentDraft);

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

  const goBack = () => {
    setError(null);
    if (createStep > 0) setCreateStep((i) => i - 1);
  };

  const submitMeldung = async () => {
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

      const effectiveKategorie: MeldeKategorie =
        notfall === true ? "notfall" : (kategorie ?? "reparatur");
      const fachfragen = buildFachfragenLeadPayload(
        bereichId ?? "sonstiges",
        fachdetailAnswers
      );
      const dringlichkeit =
        terminwunsch === "sofort" ||
        terminwunsch === "diese_woche" ||
        terminwunsch === "flexibel"
          ? terminwunsch
          : notfall
            ? "sofort"
            : null;

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
              kategorie: effectiveKategorie,
              bereichId,
              fachdetailAnswers,
              fachfragen,
              notfall: notfall ?? false,
              terminwunsch,
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
              kategorie: effectiveKategorie,
              bereichId,
              fachdetailAnswers,
              fachfragen,
              notfall: notfall ?? false,
              terminwunsch,
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
        track.meldeAbgeschickt(effectiveKategorie, orgKennung);
      }
      const q = new URLSearchParams({ org: orgName, kennung: orgKennung });
      if (json.statusLink) q.set("statusLink", json.statusLink);
      else if (json.meldeTrackingToken) q.set("token", json.meldeTrackingToken);
      router.push(`/melden/bestaetigung?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  };

  const onWeiter = async () => {
    const result = createNext(steps, createStep, currentDraft);
    if (!result.ok) {
      setError(createStepError(stepId, lang) ?? result.error);
      return;
    }
    setError(null);
    if (result.done) {
      await submitMeldung();
      return;
    }
    setCreateStep(result.createStep);
  };

  const progress = (
    <div className="mb-4">
      <div className="flex gap-1 mb-2">
        {steps.map((_, si) => (
          <div
            key={si}
            className="h-1 flex-1 rounded-sm"
            style={{
              background:
                si <= createStep
                  ? "var(--org-primary, var(--p2-primary, #2E7D52))"
                  : "#e3e6ea",
            }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold text-text-tertiary">
        {lang === "de" ? "Schritt" : "Step"} {createStep + 1}{" "}
        {lang === "de" ? "von" : "of"} {steps.length}
      </p>
      <h2 className="mt-1 text-xl font-bold text-text-primary">
        {meldeFunnelTitle(stepId, lang)}
      </h2>
    </div>
  );

  const nav = (
    <div className="flex gap-2 mt-4">
      <button
        type="button"
        className="melden-submit !bg-white !text-[#1a3d2b] border border-[#d9e3dd]"
        onClick={goBack}
        style={{ visibility: createStep === 0 ? "hidden" : "visible" }}
      >
        {meldeT(lang, "zurueck")}
      </button>
      <button
        type="button"
        className="melden-submit flex-1"
        disabled={busy || (!stepOk && stepId !== "fertig")}
        aria-disabled={!stepOk && stepId !== "fertig" ? "true" : "false"}
        onClick={() => void onWeiter()}
        style={{
          background: stepOk
            ? undefined
            : "#B9C4BC",
        }}
      >
        {busy
          ? meldeT(lang, "sending")
          : createStep < steps.length - 1
            ? meldeT(lang, "weiter")
            : lang === "de"
              ? "Vorgang absenden"
              : "Submit report"}
      </button>
    </div>
  );

  const renderStep = (id: MeldeFunnelStepId) => {
    if (id === "objekt") {
      return (
        <button
          type="button"
          className="melden-kategorie-btn w-full"
          data-active="true"
          onClick={() => setError(null)}
        >
          <span className="block font-medium text-sm">{objektLabel}</span>
        </button>
      );
    }
    if (id === "einheiten") {
      return (
        <div className="melden-field !mt-0">
          <label htmlFor="melder-einheit">{meldeT(lang, "einheit")}</label>
          {einheitenHinweis ? (
            <p className="text-xs text-text-tertiary">{einheitenHinweis}</p>
          ) : null}
          <input
            id="melder-einheit"
            value={einheit}
            onChange={(e) => setEinheit(e.target.value)}
            placeholder={meldeT(lang, "einheitPh")}
          />
        </div>
      );
    }
    if (id === "bereich") {
      return (
        <div className="melden-kategorie-grid">
          {MELDE_BEREICHE.map((b) => (
            <button
              key={b.id}
              type="button"
              className="melden-kategorie-btn"
              data-active={bereichId === b.id}
              onClick={() => {
                setBereichId(b.id);
                setFachdetailAnswers({});
                setError(null);
              }}
            >
              <span className="block font-medium text-sm">{b.label}</span>
              <span className="block text-xs text-text-tertiary mt-0.5">
                {b.hint}
              </span>
            </button>
          ))}
        </div>
      );
    }
    if (id === "kategorie") {
      return (
        <div className="melden-kategorie-grid">
          {MELDE_KATEGORIEN.map((k) => (
            <button
              key={k.id}
              type="button"
              className="melden-kategorie-btn"
              data-active={kategorie === k.id}
              data-dringend={k.dringend ? "true" : undefined}
              onClick={() => {
                setKategorie(k.id);
                if (k.id === "notfall") setNotfall(true);
                setError(null);
              }}
            >
              <span className="block font-medium text-sm">{k.label}</span>
              <span className="block text-xs text-text-tertiary mt-0.5">
                {k.hint}
              </span>
            </button>
          ))}
        </div>
      );
    }
    if (id === "fachdetail") {
      return (
        <div className="space-y-3">
          {fachQuestions.map((q) => {
            const val = fachdetailAnswers[q.id];
            return (
              <div
                key={q.id}
                className="rounded-xl border border-[#d9e3dd] p-3"
              >
                <p className="text-sm font-semibold text-text-primary mb-2">
                  {fachfrageLabel(q, lang)}
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      ["ja", lang === "en" ? "Yes" : "Ja"],
                      ["nein", lang === "en" ? "No" : "Nein"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className="melden-kategorie-btn flex-1 !py-2 !text-center"
                      data-active={val === v}
                      onClick={() =>
                        setFachdetailAnswers((prev) => ({
                          ...prev,
                          [q.id]: v,
                        }))
                      }
                    >
                      <span className="text-sm font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    if (id === "notfall") {
      return (
        <div className="space-y-2">
          {MELDE_NOTFALL_OPTIONS.map((opt) => {
            const copy = lang === "en" ? opt.en : opt.de;
            const active = notfall === opt.akut;
            return (
              <button
                key={opt.id}
                type="button"
                className="melden-kategorie-btn w-full"
                data-active={active}
                data-dringend={opt.akut ? "true" : undefined}
                onClick={() => {
                  setNotfall(opt.akut);
                  if (opt.akut) setKategorie("notfall");
                  setError(null);
                }}
              >
                <span className="block font-medium text-sm">{copy.title}</span>
                <span className="block text-xs text-text-tertiary mt-0.5">
                  {copy.sub}
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    if (id === "medien") {
      return (
        <>
          <p className="text-sm text-text-secondary mb-2">
            {lang === "de"
              ? "Fotos helfen, das Problem schneller einzuschätzen (optional)."
              : "Photos help assess the problem faster (optional)."}
          </p>
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
        </>
      );
    }
    if (id === "beschreibung") {
      return (
        <div className="melden-field !mt-0">
          <label htmlFor="melder-text">{meldeT(lang, "beschreibung")}</label>
          <textarea
            id="melder-text"
            rows={4}
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            minLength={10}
            placeholder={
              lang === "de"
                ? "Was ist das Problem?"
                : "What is the problem?"
            }
          />
          <p className="text-xs text-text-tertiary">
            {lang === "de" ? "Mind. 10 Zeichen · " : "Min. 10 characters · "}
            {beschreibung.trim().length}{" "}
            {lang === "de" ? "erfasst" : "entered"}
          </p>
        </div>
      );
    }
    if (id === "stamm") {
      return (
        <>
          <div className="melden-field !mt-0">
            <label htmlFor="melder-name">{meldeT(lang, "name")}</label>
            <input
              id="melder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
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
        </>
      );
    }
    if (id === "verwaltung") {
      return (
        <div className="rounded-xl border border-[#d9e3dd] bg-[#f7f8fa] p-4 text-sm text-text-secondary leading-relaxed">
          <p className="font-semibold text-text-primary mb-1">{orgName}</p>
          <p>
            {lang === "de"
              ? "Ihre Meldung geht an Ihre Hausverwaltung. Bärenwald informiert den zuständigen Fachbetrieb erst nach Freigabe bzw. bei Notfall direkt."
              : "Your report goes to your property management. Bärenwald notifies the contractor after approval — or immediately in an emergency."}
          </p>
          {footerKurz ? (
            <p className="mt-3 text-xs text-text-tertiary">{footerKurz}</p>
          ) : null}
        </div>
      );
    }
    if (id === "regeln") {
      return (
        <div className="space-y-3">
          <MeldeDatenschutzHinweis
            orgName={orgName}
            mode={mode}
            datenschutzHref={datenschutzHref}
            impressumHref={impressumHref}
          />
          <label className="flex items-start gap-3 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={regelnAccepted}
              onChange={(e) => setRegelnAccepted(e.target.checked)}
            />
            <span>
              {lang === "de"
                ? `Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Angaben durch ${orgName} zur Bearbeitung Ihrer Meldung zu.`
                : `By submitting you agree to the processing of your data by ${orgName} to handle your report.`}
            </span>
          </label>
        </div>
      );
    }
    if (id === "termin") {
      return (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary mb-1">
            {lang === "de"
              ? "Wunschtermine (unverbindlich) oder zeitliche Präferenz:"
              : "Preferred slots (non-binding) or timing preference:"}
          </p>
          {terminSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              className="melden-kategorie-btn w-full"
              data-active={terminwunsch === s.line}
              onClick={() => {
                setTerminwunsch(s.line);
                setError(null);
              }}
            >
              <span className="block font-medium text-sm">{s.line}</span>
            </button>
          ))}
          {MELDE_TERMIN_QUALITATIV.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="melden-kategorie-btn w-full"
              data-active={terminwunsch === opt.id}
              onClick={() => {
                setTerminwunsch(opt.id);
                setError(null);
              }}
            >
              <span className="block font-medium text-sm">
                {lang === "en" ? opt.en : opt.de}
              </span>
            </button>
          ))}
        </div>
      );
    }
    // fertig — Zusammenfassung
    return (
      <div className="rounded-xl bg-[#f7f8fa] p-4 text-sm space-y-2 text-left">
        <p>
          <b>Objekt: </b>
          {objektLabel || "—"}
        </p>
        <p>
          <b>{lang === "de" ? "Einheit: " : "Unit: "}</b>
          {einheit || "—"}
        </p>
        <p>
          <b>{lang === "de" ? "Bereich: " : "Area: "}</b>
          {MELDE_BEREICHE.find((b) => b.id === bereichId)?.label ?? "—"}
        </p>
        <p>
          <b>{lang === "de" ? "Kategorie: " : "Category: "}</b>
          {MELDE_KATEGORIEN.find((k) => k.id === kategorie)?.label ?? "—"}
        </p>
        <p>
          <b>{lang === "de" ? "Dringlichkeit: " : "Urgency: "}</b>
          {notfall
            ? lang === "de"
              ? "⚡ Notfall"
              : "⚡ Emergency"
            : lang === "de"
              ? "Normal"
              : "Normal"}
        </p>
        <p>
          <b>{lang === "de" ? "Terminwunsch: " : "Preferred slot: "}</b>
          {terminwunsch
            ? MELDE_TERMIN_QUALITATIV.find((o) => o.id === terminwunsch)?.[
                lang === "en" ? "en" : "de"
              ] ?? terminwunsch
            : "—"}
        </p>
        <p>
          <b>{lang === "de" ? "Beschreibung: " : "Description: "}</b>
          {beschreibung || "—"}
        </p>
      </div>
    );
  };

  const brand: MieterWlBrand = useMemo(
    () => ({
      name: orgName,
      sub: orgSub,
      logoUrl: orgLogoUrl,
      logoKuerzel: orgLogoKuerzel,
      primary: orgPrimaryColor,
      primaryDk: orgPrimaryColorDk,
      soft: orgPrimaryColorSoft,
      tel: mieterKontaktTelefon,
      mail: mieterKontaktEmail,
    }),
    [
      orgName,
      orgSub,
      orgLogoUrl,
      orgLogoKuerzel,
      orgPrimaryColor,
      orgPrimaryColorDk,
      orgPrimaryColorSoft,
      mieterKontaktTelefon,
      mieterKontaktEmail,
    ]
  );

  return (
    <MieterWlFrame brand={brand} lang={lang} onLangChange={setLang}>
      <MieterWlCard>
        <div className="p-4 sm:p-5">
          <div className="mb-3">
            <h1 className="text-[17px] font-bold text-[#16201B]">
              {mode === "ergaenzen"
                ? meldeT(lang, "ergaenzen")
                : MELDE_FUNNEL_INTRO.title}
            </h1>
            {mode === "melden" ? (
              <p className="text-xs text-text-tertiary mt-0.5 leading-snug">
                {MELDE_FUNNEL_INTRO.sub}
              </p>
            ) : null}
            {objektLabel ? (
              <p className="mt-2 text-[12.5px] font-semibold text-[color:var(--org-primary,#2E7D52)]">
                {objektLabel}
                {einheitenHinweis ? ` · ${einheitenHinweis}` : ""}
              </p>
            ) : null}
          </div>
          {progress}
          {renderStep(stepId)}
          {error ? (
            <p
              className="text-sm text-red-700 mt-3 rounded-lg bg-[#FDECEC] border border-[#F5C2C0] px-3 py-2 font-semibold"
              role="alert"
            >
              ⚠ {error}
            </p>
          ) : null}
          {nav}
        </div>
      </MieterWlCard>
      {footerKurz ? (
        <p className="text-center text-xs text-text-tertiary mt-3 px-2">
          {footerKurz}
        </p>
      ) : null}
    </MieterWlFrame>
  );
}
