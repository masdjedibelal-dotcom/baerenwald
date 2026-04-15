"use client";

import { useCallback, useMemo, useState } from "react";

import { formatCurrencyEUR } from "@/lib/price-calc";
import type { BudgetCheck, FunnelState, PriceLineItem } from "@/lib/funnel/types";
import {
  getBwPreisFaktorHint,
  getBwResultModus,
} from "@/lib/funnel/price-calc";
import type { BwResultModus } from "@/lib/funnel/price-calc";
import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";
import { DatenschutzCheckbox } from "./DatenschutzCheckbox";

const RESULT_TESTIMONIALS = [
  {
    quote: "Transparenter Preis, pünktlicher Handwerker.",
    name: "Familie K.",
    ort: "Schwabing",
    initials: "FK",
    bg: "#eaf3de",
    color: "#2e7d52",
  },
  {
    quote: "Ein Anruf — alles lief. Kein Stress.",
    name: "Lena M.",
    ort: "Maxvorstadt",
    initials: "LM",
    bg: "#e0f2f1",
    color: "#00695c",
  },
  {
    quote: "Innerhalb 24h war jemand da.",
    name: "Sandra B.",
    ort: "Bogenhausen",
    initials: "SB",
    bg: "#e3f2fd",
    color: "#1565c0",
  },
] as const;

const TRUST_POINTS = [
  "Meisterbetriebe München",
  "Ein Ansprechpartner",
  "Anfahrt bei Auftrag angerechnet",
] as const;

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6l3 3 5-5"
        stroke="var(--fl-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPreisfaktoren(state: FunnelState): string[] {
  const punkte: string[] = [];

  if (state.zustand === "mittel") {
    punkte.push("Vorarbeiten nötig — Fläche muss vorbereitet werden");
  }
  if (state.zustand === "schlecht") {
    punkte.push("Erheblicher Mehraufwand durch den Zustand der Fläche");
  }
  if (state.zugaenglichkeit === "mittel") {
    punkte.push("Erschwerte Erreichbarkeit erhöht den Materialaufwand");
  }
  if (state.zugaenglichkeit === "schwer") {
    punkte.push("Schwer zugängliches Objekt — Spezialausrüstung erforderlich");
  }
  if (
    state.dringlichkeit === "akut" ||
    state.dringlichkeit === "stabil"
  ) {
    punkte.push("Kurzfristiger Einsatz — Terminpriorität berücksichtigt");
  }
  if (state.zeitraum === "sofort" || state.zeitraum === "heute") {
    punkte.push("Kurzfristiger Einsatz — Terminpriorität berücksichtigt");
  }
  if (state.kundentyp === "mieter") {
    punkte.push("Mietobjekt — Abstimmung mit Vermieter möglicherweise nötig");
  }
  if (state.fachdetails?.sanitaer?.lage === "wand") {
    punkte.push("Leck hinter der Wand — Stemmarbeiten wahrscheinlich");
  }
  if (state.fachdetails?.boden?.verlegung === "geklebt") {
    punkte.push("Geklebter Altbelag muss aufwendig entfernt werden");
  }
  if (state.fachdetails?.boden?.aktuell === "fliesen") {
    punkte.push("Fliesenrückbau ist zeitaufwendig und materialintensiv");
  }
  if (state.fachdetails?.maler?.zustand === "risse") {
    punkte.push("Wandvorbereitung nötig — Spachteln und Schleifen");
  }
  if (state.fachdetails?.maler?.zustand === "stark") {
    punkte.push("Starke Schäden erfordern umfangreiche Vorarbeiten");
  }
  if (state.fachdetails?.dach?.alter === "ueber40") {
    punkte.push("Älteres Dach — mögliche Zusatzschäden beim Aufdecken");
  }
  if (state.bereiche.length >= 3) {
    punkte.push("Mehrere Gewerke — wir koordinieren alle Arbeiten");
  }

  const seen = new Set<string>();
  return punkte.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

function PhoneIconKomplex() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BtnSpinner() {
  return <span className="btn-spinner" aria-hidden />;
}

function EnvelopeIcon16() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 2h6l6 6-6 6-6-6V2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  );
}

function PreisAccordion({
  state,
  koordinationsRabatt,
}: {
  state: FunnelState;
  koordinationsRabatt: number;
}) {
  const [open, setOpen] = useState(false);
  const faktoren = useMemo(() => getPreisfaktoren(state), [state]);

  if (state.breakdown.length === 0) return null;

  const hasRabatt = koordinationsRabatt < 1.0;
  const rabattProzent = Math.round((1 - koordinationsRabatt) * 100);

  return (
    <div className="preis-accordion">
      <button
        type="button"
        className={`preis-accordion-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Wie setzt sich der Preis zusammen?</span>
        <svg
          className="preis-accordion-arrow"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="preis-accordion-body">
          <table className="preis-breakdown-table">
            <thead>
              <tr>
                <th>Leistung</th>
                <th>Von</th>
                <th>Bis</th>
              </tr>
            </thead>
            <tbody>
              {state.breakdown.map((item, i) => (
                <tr key={i}>
                  <td>{item.beschreibung}</td>
                  <td>{item.min.toLocaleString("de")} €</td>
                  <td>{item.max.toLocaleString("de")} €</td>
                </tr>
              ))}
              {hasRabatt ? (
                <tr className="preis-breakdown-rabatt">
                  <td>Koordinationsrabatt</td>
                  <td
                    colSpan={2}
                    style={{ color: "var(--fl-accent)", textAlign: "right" }}
                  >
                    −{rabattProzent}&thinsp;%
                  </td>
                </tr>
              ) : null}
              {state.breakdown.length > 1 ? (
                <tr className="preis-breakdown-total">
                  <td>Gesamt</td>
                  <td>{state.priceMin.toLocaleString("de")} €</td>
                  <td>{state.priceMax.toLocaleString("de")} €</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {faktoren.length > 0 ? (
            <div className="preis-faktoren">
              <p className="preis-faktoren-label">Warum dieser Preisrahmen?</p>
              <ul className="preis-faktoren-list">
                {faktoren.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultTrustBlock() {
  const t = useMemo(
    () => RESULT_TESTIMONIALS[Math.floor(Math.random() * RESULT_TESTIMONIALS.length)],
    []
  );
  return (
    <div className="result-trust-block">
      <div className="result-trust-quote">
        <div className="result-trust-stars">{"★".repeat(5)}</div>
        <p className="result-trust-text">„{t.quote}"</p>
        <div className="result-trust-author">
          <div
            className="result-trust-avatar"
            style={{ background: t.bg, color: t.color }}
          >
            {t.initials}
          </div>
          <div>
            <div className="result-trust-name">{t.name}</div>
            <div className="result-trust-ort">{t.ort}</div>
          </div>
        </div>
      </div>
      <div className="result-trust-points">
        {TRUST_POINTS.map((point) => (
          <div key={point} className="result-trust-point">
            <CheckIcon />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BwResultScreenProps {
  state: FunnelState;
  onBudgetChange?: (v: BudgetCheck) => void;
  mindestauftragAktiv?: boolean;
  plzFaktor?: number;
  koordinationsRabatt?: number;
  resultModus?: BwResultModus;
  schwellenwertAusgeloest?: boolean;
  /** Nach erfolgreichem Rückruf-Formular („zu komplex“). */
  onKomplexRueckrufSuccess?: () => void;
  className?: string;
}

function gewerkLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function gewerkSquareClass(g: string): string {
  const x = g.toLowerCase();
  if (x.includes("bad") || x.includes("küche") || x.includes("kueche"))
    return "bg-[#E6F1FB] text-[#0C447C]";
  if (x.includes("heizung") || x.includes("sanit"))
    return "bg-[#FDECEA] text-[#9C2B2B]";
  if (x.includes("garten") || x.includes("baum"))
    return "bg-[#EAF3DE] text-[#3B6D11]";
  if (x.includes("elektro")) return "bg-[#FDF3DC] text-[#854F0B]";
  return "bg-[#F0F4FF] text-[#185FA5]";
}

function BreakdownRow({ row }: { row: PriceLineItem }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-default px-3.5 py-2.5 last:border-b-0">
      <div className="flex min-w-0 gap-2">
        <div
          className={cn(
            "flex size-[26px] shrink-0 items-center justify-center rounded-md",
            gewerkSquareClass(row.gewerk)
          )}
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-primary">{row.gewerk}</p>
          <p className="text-[11px] text-text-secondary">{row.beschreibung}</p>
        </div>
      </div>
      <p className="shrink-0 text-[13px] font-medium tabular-nums text-text-primary">
        {formatCurrencyEUR(row.min)} – {formatCurrencyEUR(row.max)}
      </p>
    </div>
  );
}

function validateKomplexTelefon(raw: string): string | undefined {
  const tel = raw.replace(/[\s\-]/g, "");
  if (!tel) return "Telefonnummer wird benötigt.";
  if (!/^(\+49|0)[1-9]\d{6,13}$/.test(tel)) {
    return "Bitte gib eine gültige Telefonnummer ein.";
  }
  return undefined;
}

function ZuKomplexScreen({
  state,
  schwellenwertAusgeloest,
  onKomplexRueckrufSuccess,
  className,
}: {
  state: FunnelState;
  schwellenwertAusgeloest: boolean;
  onKomplexRueckrufSuccess?: () => void;
  className?: string;
}) {
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [telefon, setTelefon] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [showDatenschutzError, setShowDatenschutzError] = useState(false);
  const [errors, setErrors] = useState<{ telefon?: string }>({});
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const headline = schwellenwertAusgeloest
    ? "Für dieses Projekt brauchen wir ein persönliches Gespräch."
    : "Dieses Projekt planen wir persönlich mit dir.";

  const sub = schwellenwertAusgeloest
    ? "Bei Projekten dieser Größenordnung ist ein automatischer Preis nicht seriös — zu viele Details beeinflussen das Ergebnis."
    : "Zu viele Faktoren beeinflussen den Preis. Ein kurzes Gespräch ist hier sinnvoller als eine automatische Berechnung.";

  const handleKomplexSubmit = useCallback(async () => {
    setErrors({});
    const telErr = validateKomplexTelefon(telefon);
    if (telErr) {
      setErrors({ telefon: telErr });
      return;
    }
    if (!datenschutz) {
      setShowDatenschutzError(true);
      return;
    }
    setSubmitStatus("loading");
    setErrorMessage("");
    const name =
      `${vorname.trim()} ${nachname.trim()}`.trim() || "Ohne Namenangabe";
    const body = {
      name,
      email: "",
      telefon: telefon.trim(),
      situation: state.situation,
      bereiche: state.bereiche,
      priceMin: state.priceMin,
      priceMax: state.priceMax,
      plz: state.plz,
      zeitraum: state.zeitraum,
      budgetCheck: state.budgetCheck,
      budgetGespraech: state.budgetCheck === "zu_hoch",
      selectedSlot: state.selectedSlot,
      photoCount: 0,
      dringlichkeit: state.dringlichkeit,
      umfang: state.umfang,
      kundentyp: state.kundentyp ?? "nicht angegeben",
      beschreibung: beschreibung.trim(),
      leadType: "komplex_rueckruf" as const,
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setSubmitStatus("error");
        setErrorMessage(
          data.error ?? "Versuch es bitte erneut oder ruf uns direkt an."
        );
        return;
      }
      onKomplexRueckrufSuccess?.();
    } catch {
      setSubmitStatus("error");
      setErrorMessage(
        "Netzwerkfehler. Bitte versuche es erneut oder nutze den Anruf-Button."
      );
    }
  }, [
    beschreibung,
    datenschutz,
    nachname,
    onKomplexRueckrufSuccess,
    state,
    telefon,
    vorname,
  ]);

  const telTrim = telefon.trim();
  const submitDisabled =
    !telTrim || !datenschutz || submitStatus === "loading";

  return (
    <div className={cn("komplex-screen", className)}>
      <div className="komplex-header">
        <div className="komplex-icon" aria-hidden>
          💬
        </div>
        <h2 className="komplex-headline">{headline}</h2>
        <p className="komplex-sub">{sub}</p>
      </div>

      <div className="komplex-option">
        <div className="komplex-option-label">Sofort sprechen</div>
        <a href={SITE_CONFIG.phoneHref} className="komplex-call-btn">
          <PhoneIconKomplex />
          {SITE_CONFIG.phone}
        </a>
        <p className="komplex-call-hint">
          Mo–Fr 7–18 Uhr · Sa 8–14 Uhr
        </p>
      </div>

      <div className="komplex-divider">
        <span>oder</span>
      </div>

      <div className="komplex-option">
        <div className="komplex-option-label">Rückruf anfordern</div>

        <div className="komplex-form">
          <div className="komplex-form-row">
            <input
              type="text"
              placeholder="Vorname"
              autoComplete="given-name"
              className="funnel-input"
              value={vorname}
              onChange={(e) => setVorname(e.target.value)}
            />
            <input
              type="text"
              placeholder="Nachname"
              autoComplete="family-name"
              className="funnel-input"
              value={nachname}
              onChange={(e) => setNachname(e.target.value)}
            />
          </div>

          <input
            type="tel"
            placeholder="Telefon *"
            autoComplete="tel"
            inputMode="tel"
            className="funnel-input"
            value={telefon}
            onChange={(e) => {
              setTelefon(e.target.value);
              if (errors.telefon) setErrors({});
            }}
          />
          {errors.telefon ? (
            <p className="field-error">{errors.telefon}</p>
          ) : null}

          <textarea
            placeholder="Kurze Beschreibung deines Projekts (optional)"
            className="funnel-textarea"
            rows={3}
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
          />

          <DatenschutzCheckbox
            checked={datenschutz}
            onChange={(v) => {
              setDatenschutz(v);
              if (v) setShowDatenschutzError(false);
            }}
            showError={showDatenschutzError}
          />

          <button
            type="button"
            className="komplex-submit-btn"
            onClick={() => void handleKomplexSubmit()}
            disabled={submitDisabled}
          >
            {submitStatus === "loading" ? (
              <>
                <BtnSpinner />
                Wird gesendet…
              </>
            ) : (
              "Rückruf anfordern →"
            )}
          </button>

          {submitStatus === "error" ? (
            <div className="submit-error-box">
              <p className="submit-error-text">{errorMessage}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BwResultScreen({
  state,
  onBudgetChange,
  mindestauftragAktiv,
  plzFaktor = 1.0,
  koordinationsRabatt = 1.0,
  resultModus,
  schwellenwertAusgeloest = false,
  onKomplexRueckrufSuccess,
  className,
}: BwResultScreenProps) {
  const [emailSaveOpen, setEmailSaveOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveEmailSent, setSaveEmailSent] = useState(false);
  const [saveEmailError, setSaveEmailError] = useState("");
  const [showBudgetOkFeedback, setShowBudgetOkFeedback] = useState(false);

  const notfallAkut =
    state.situation === "notfall" && state.dringlichkeit === "akut";
  const budget = state.budgetCheck;

  if (notfallAkut) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="relative overflow-hidden rounded-[18px] bg-surface-dark p-5 text-center text-white">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
              <span aria-hidden>⚡</span> Dringend
            </span>
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-widest text-white/70">
            Notfall
          </p>
          <p className="mt-2 text-lg font-semibold">Wir sind jetzt erreichbar</p>
          <a
            href={SITE_CONFIG.phoneHref}
            className="mt-2 block text-3xl font-extrabold tracking-tight text-white"
          >
            {SITE_CONFIG.phone}
          </a>
          <p className="mt-1 text-sm text-white/70">
            Mobil · oder Büro:{" "}
            <a href={SITE_CONFIG.phoneFestnetHref} className="underline text-white">
              {SITE_CONFIG.phoneFestnetz}
            </a>
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            className="mt-5 inline-flex w-full max-w-xs justify-center rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Jetzt anrufen
          </a>
        </div>
      </div>
    );
  }

  const isZuKomplex =
    resultModus === "zu_komplex" || getBwResultModus(state) === "zu_komplex";

  if (isZuKomplex) {
    return (
      <ZuKomplexScreen
        state={state}
        schwellenwertAusgeloest={schwellenwertAusgeloest}
        onKomplexRueckrufSuccess={onKomplexRueckrufSuccess}
        className={className}
      />
    );
  }

  const hasRange = state.priceMin > 0 && state.priceMax > 0;
  const preisFaktorHint = getBwPreisFaktorHint(state);
  const preisFaktorStandard =
    preisFaktorHint === "Standardpreis für München 2026";

  const scrollToLeadForm = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById("lead-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  }, []);

  const handleSaveEmail = useCallback(async () => {
    setSaveEmailError("");
    const email = saveEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveEmailError("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    try {
      const res = await fetch("/api/save-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          priceMin: state.priceMin,
          priceMax: state.priceMax,
          situation: state.situation,
          bereiche: state.bereiche,
          plz: state.plz,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveEmailSent(true);
    } catch {
      setSaveEmailError(
        "Senden fehlgeschlagen — bitte versuche es erneut."
      );
    }
  }, [
    saveEmail,
    state.priceMin,
    state.priceMax,
    state.situation,
    state.bereiche,
    state.plz,
  ]);

  return (
    <div className={cn("space-y-5", className)}>
      {hasRange ? (
        <div className="relative overflow-hidden rounded-[18px] bg-surface-dark p-5 text-white">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#777]">
            Dein Preisrahmen
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-1">
            <span className="text-[38px] font-extrabold leading-none tracking-tight">
              {formatCurrencyEUR(state.priceMin)}
            </span>
            <span className="text-lg text-[#555]">–</span>
            <span className="text-[38px] font-extrabold leading-none tracking-tight">
              {formatCurrencyEUR(state.priceMax)}
            </span>
            <span className="text-sm text-[#777]">€</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#666]">
            Richtwert für {SITE_CONFIG.region} — unverbindlich.
          </p>
          <p
            className="mt-2 text-[12px] leading-relaxed"
            style={{
              color: "var(--fl-text-3, #9e9e9e)",
            }}
          >
            {preisFaktorStandard ? (
              preisFaktorHint
            ) : (
              <>
                Preis beeinflusst durch: {preisFaktorHint}
              </>
            )}
          </p>
          {plzFaktor > 1.08 ? (
            <p style={{ fontSize: "12px", color: "var(--fl-text-3, #9e9e9e)", marginTop: "6px" }}>
              Münchner Innenstadtlage berücksichtigt
            </p>
          ) : null}
          {koordinationsRabatt < 1.0 ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--fl-accent)",
                background: "var(--fl-accent-light)",
                borderRadius: "999px",
                padding: "4px 10px",
                marginTop: "8px",
              }}
            >
              <TagIcon />
              {koordinationsRabatt <= 0.90
                ? "10% Koordinationsrabatt für mehrere Gewerke"
                : "5% Koordinationsrabatt für mehrere Gewerke"}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.bereiche.map((g) => (
              <span
                key={g}
                className="rounded-full bg-surface-card/10 px-2.5 py-0.5 text-[10px] text-[#aaa]"
              >
                {gewerkLabel(g)}
              </span>
            ))}
          </div>
          {state.istFallback ? (
            <div className="hinweis" style={{ marginTop: "12px" }}>
              <p>
                Für deine Auswahl haben wir noch keinen genauen Richtwert — der
                Preisrahmen basiert auf allgemeinen Münchner Marktpreisen. Beim
                Vor-Ort-Termin nennen wir dir einen genauen Preis.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[18px] border border-border-default bg-muted p-5 text-center text-sm text-text-secondary">
          Für deine Angaben ergibt sich kein automatischer Preisrahmen — wir
          melden uns persönlich.
        </div>
      )}

      {hasRange ? (
        <p className="preis-disclaimer">
          * Unverbindlicher Richtwert basierend auf Ihren Angaben. Das
          verbindliche Festpreisangebot erhalten Sie nach dem Vor-Ort-Termin.
          Preise inkl. MwSt.
        </p>
      ) : null}

      {hasRange && resultModus === "preisrahmen_warnung" ? (
        <div className="preis-warnung-box">
          <div className="preis-warnung-icon">⚠</div>
          <div>
            <p className="preis-warnung-head">Größeres Projekt — Richtwert</p>
            <p className="preis-warnung-text">
              Bei Projekten dieser Größenordnung kann der finale Preis stärker
              abweichen. Wir schauen uns das beim Vor-Ort-Termin genau an und
              erstellen ein verbindliches Festpreisangebot.
            </p>
          </div>
        </div>
      ) : null}

      {hasRange && !state.istFallback ? (
        <PreisAccordion state={state} koordinationsRabatt={koordinationsRabatt} />
      ) : null}

      {mindestauftragAktiv ? (
        <div
          className="hinweis"
          style={{ marginTop: "12px" }}
        >
          <p>
            Mindestauftragswert 150 € — inklusive Anfahrt und erster Einschätzung
            vor Ort.
          </p>
        </div>
      ) : null}

      {hasRange ? <ResultTrustBlock /> : null}

      {hasRange && !saveEmailSent ? (
        <div className="preis-save-wrap">
          {!emailSaveOpen ? (
            <button
              type="button"
              className="preis-save-trigger"
              onClick={() => setEmailSaveOpen(true)}
            >
              <EnvelopeIcon16 />
              Preisrahmen per E-Mail speichern
            </button>
          ) : (
            <div className="preis-save-form">
              <p className="preis-save-label">
                Wir schicken dir den Preisrahmen direkt zu — kein Spam, nur dein
                Ergebnis.
              </p>
              <div className="preis-save-row">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="deine@email.de"
                  className="funnel-input"
                  value={saveEmail}
                  onChange={(e) => {
                    setSaveEmail(e.target.value);
                    if (saveEmailError) setSaveEmailError("");
                  }}
                />
                <button
                  type="button"
                  className="preis-save-btn"
                  disabled={
                    !saveEmail.includes("@") || saveEmail.trim().length < 5
                  }
                  onClick={() => void handleSaveEmail()}
                >
                  Senden
                </button>
              </div>
              {saveEmailError ? (
                <p className="field-error">{saveEmailError}</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {hasRange && saveEmailSent ? (
        <div className="preis-save-success">
          <span aria-hidden>✓</span>
          Preisrahmen wurde gesendet — schau in dein Postfach.
        </div>
      ) : null}

      {hasRange ? (
        <div>
          <p className="mb-3 mt-5 text-sm font-medium text-text-primary">
            Passt dieser Rahmen zu deinem Budget?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onBudgetChange?.("ok");
                setShowBudgetOkFeedback(true);
                scrollToLeadForm();
              }}
              className={cn(
                "rounded-full border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors",
                budget === "ok"
                  ? "funnel-tile-selected text-text-primary"
                  : "funnel-tile-hover"
              )}
            >
              ✓ Ja, passt gut
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBudgetOkFeedback(false);
                onBudgetChange?.("zu_hoch");
              }}
              className={cn(
                "rounded-full border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors",
                budget === "zu_hoch"
                  ? "funnel-tile-selected text-text-primary"
                  : "funnel-tile-hover"
              )}
            >
              Eher zu hoch
            </button>
          </div>
          {showBudgetOkFeedback && budget === "ok" ? (
            <p
              className="mt-3 text-sm font-semibold"
              style={{ color: "var(--fl-accent, #2e7d52)" }}
            >
              Super — dann los.
            </p>
          ) : null}
          {budget === "zu_hoch" ? (
            <div className="budget-hint-box">
              <p className="budget-hint-head">Kein Problem.</p>
              <p className="budget-hint-text">
                Beim Vor-Ort-Termin schauen wir gemeinsam was in deinem Budget
                möglich ist — ohne Druck und ohne Auftragszwang. Viele Projekte
                lassen sich auch in Phasen umsetzen.
              </p>
              <button
                type="button"
                className="budget-hint-cta"
                onClick={scrollToLeadForm}
              >
                Trotzdem Termin anfragen →
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasRange ? (
        <div
          id="lead-form"
          className="pointer-events-none h-px w-full scroll-mt-24 opacity-0"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
