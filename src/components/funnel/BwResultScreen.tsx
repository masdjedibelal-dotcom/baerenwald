"use client";

import { useCallback, useMemo, useState } from "react";

import { formatCurrencyEUR } from "@/lib/price-calc";
import {
  getResolvedStepsForSituation,
  getZustandDisplayLabel,
} from "@/lib/funnel/config";
import type { FunnelState } from "@/lib/funnel/types";
import {
  calculatePrice,
  getBwResultModus,
  type BwResultModus,
} from "@/lib/funnel/price-calc";
import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import { DatenschutzCheckbox } from "./DatenschutzCheckbox";
import { NeueAnfrageResetLink } from "./NeueAnfrageResetLink";

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

function getAktiveGewerke(state: FunnelState): string[] {
  const gewerke: string[] = [];
  const { bereiche } = state;

  const push = (g: string) => {
    if (!gewerke.includes(g)) gewerke.push(g);
  };

  if (
    bereiche.includes("bad") ||
    bereiche.includes("wasser") ||
    bereiche.includes("sanitaer") ||
    bereiche.includes("feuchtigkeit_schimmel")
  ) {
    push("sanitaer");
  }
  if (bereiche.includes("heizung")) push("heizung");
  if (bereiche.includes("feuchtigkeit_schimmel")) {
    push("maler");
  }
  if (
    bereiche.includes("strom") ||
    bereiche.includes("elektrik") ||
    bereiche.includes("elektro")
  ) {
    push("elektro");
  }
  if (
    bereiche.includes("maler") ||
    bereiche.includes("waende") ||
    bereiche.includes("waende_boeden") ||
    bereiche.includes("streichen") ||
    bereiche.includes("fassade")
  ) {
    push("maler");
  }
  if (bereiche.includes("boden") || bereiche.includes("terrasse")) {
    push("boden");
  }
  if (bereiche.includes("dach")) push("dach");
  if (
    bereiche.includes("garten") ||
    bereiche.includes("gestaltung") ||
    bereiche.includes("baum")
  ) {
    push("garten");
  }
  if (
    bereiche.includes("trockenbau") ||
    bereiche.includes("keller_dg") ||
    bereiche.includes("umbau") ||
    bereiche.includes("anbau")
  ) {
    push("trockenbau");
  }

  return gewerke;
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

function ResultTestimonialCard() {
  const testimonial = useMemo(
    () =>
      RESULT_TESTIMONIALS[
        Math.floor(Math.random() * RESULT_TESTIMONIALS.length)
      ],
    []
  );
  return (
    <div className="result-testimonial-card">
      <div className="result-stars">{"★".repeat(5)}</div>
      <p className="result-quote">„{testimonial.quote}“</p>
      <div className="result-author">
        <div
          className="result-avatar"
          style={{
            background: testimonial.bg,
            color: testimonial.color,
          }}
        >
          {testimonial.initials}
        </div>
        <div>
          <div className="result-name">{testimonial.name}</div>
          <div className="result-ort">{testimonial.ort}</div>
        </div>
      </div>
    </div>
  );
}

export interface BwResultScreenProps {
  state: FunnelState;
  mindestauftragAktiv?: boolean;
  resultModus?: BwResultModus;
  schwellenwertAusgeloest?: boolean;
  /** Nach erfolgreichem Rückruf-Formular („zu komplex“). */
  onKomplexRueckrufSuccess?: () => void;
  /** Funnel neu ab Situation / Trust — State wird im Parent zurückgesetzt. */
  onReset?: () => void;
  className?: string;
}

function gewerkLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function bereicheDisplayLabels(state: FunnelState): string[] {
  if (!state.situation) return state.bereiche.map(gewerkLabel);
  const step0 = getResolvedStepsForSituation(
    state.situation,
    state.bereiche,
    state.fachdetails,
    state.umfang
  )[0];
  const opts = step0?.options ?? [];
  return state.bereiche.map((v) => {
    const o = opts.find((x) => x.value === v);
    return o?.label ?? gewerkLabel(v);
  });
}

const WAENDE_TILE_QM = new Set([40, 90, 160, 280]);

function groesseEinordnungLine(state: FunnelState): string | null {
  if (state.groesse == null) return null;
  const waendeDiskret =
    (state.situation === "erneuern" || state.situation === "kaputt") &&
    (state.bereiche.includes("waende") ||
      state.bereiche.includes("maler") ||
      state.bereiche.includes("streichen")) &&
    WAENDE_TILE_QM.has(state.groesse);
  if (waendeDiskret) return null;
  if (state.groesseEinheit === "stueck") {
    return `ca. ${state.groesse} Stück`;
  }
  if (state.groesseEinheit === "meter") {
    return `ca. ${state.groesse} m`;
  }
  return `ca. ${state.groesse} m²`;
}

function ResultEinordnung({ state }: { state: FunnelState }) {
  const labels = bereicheDisplayLabels(state);
  const top = labels.slice(0, 2);
  const gewerkLine =
    top.length === 0
      ? null
      : top.length === 1
        ? top[0]
        : `${top[0]} + ${top[1]}`;
  const zLine = getZustandDisplayLabel(state.zustand, state.bereiche);
  const gLine = groesseEinordnungLine(state);
  if (!gewerkLine && !zLine && !gLine) return null;
  return (
    <div className="result-einordnung">
      <p className="result-einordnung-title">Das ist typisch für:</p>
      <ul className="result-einordnung-list">
        {gewerkLine ? (
          <li>
            <span aria-hidden>✓</span> {gewerkLine}
          </li>
        ) : null}
        {zLine ? (
          <li>
            <span aria-hidden>✓</span> {zLine}
          </li>
        ) : null}
        {gLine ? (
          <li>
            <span aria-hidden>✓</span> {gLine}
          </li>
        ) : null}
      </ul>
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

function ZuKomplexScreen({
  state,
  schwellenwertAusgeloest: _schwellenwertAusgeloest,
  onKomplexRueckrufSuccess,
  onReset,
  className,
}: {
  state: FunnelState;
  schwellenwertAusgeloest: boolean;
  onKomplexRueckrufSuccess?: () => void;
  onReset?: () => void;
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

  const preisPreview = useMemo(
    () => calculatePrice(state, { preview: true }),
    [state]
  );
  const abMin = preisPreview.min > 0 ? preisPreview.min : 1200;

  const scrollToRueckruf = useCallback(() => {
    document.getElementById("komplex-rueckruf-anchor")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const karteNeubauenStil =
    state.situation === "neubauen" ||
    (state.situation === "erneuern" &&
      state.komplexReason === "no_mapping_found");
  const karteGewerbe = state.situation === "gewerbe";

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
    try {
      const result = await submitBwLead({
        name,
        telefon: telefon.trim(),
        nachricht: beschreibung.trim() || undefined,
        situation: state.situation,
        bereiche: state.bereiche,
        preis_min: state.priceMin,
        preis_max: state.priceMax,
        plz: state.plz,
        zeitraum: state.zeitraum,
        kundentyp: state.kundentyp ?? "nicht angegeben",
        funnel_daten: {
          ...serializeFunnelStateForLead(state),
          budgetCheck: state.budgetCheck,
          budgetGespraech: state.budgetCheck === "zu_hoch",
          selectedSlot: state.selectedSlot,
          dringlichkeit: state.dringlichkeit,
          umfang: state.umfang,
        },
        funnel_quelle: "komplex_rueckruf",
      });
      if (!result.ok) {
        setSubmitStatus("error");
        setErrorMessage(
          result.error ??
            "Versuch es bitte erneut oder ruf uns direkt an."
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

  const fassadeDaemmungKomplex = state.bereiche.includes("fassade_daemmung");

  return (
    <div className={cn("komplex-screen", className)}>
      {karteGewerbe ? (
        <div className="komplex-card">
          <h2>Gewerbliches Projekt?</h2>
          <p>
            Ob Büro, Praxis, Laden oder Gastronomie — wir planen individuell
            mit dir. Melde dich kurz und wir melden uns innerhalb von 24h.
          </p>
          <button
            type="button"
            className="komplex-card-cta"
            onClick={scrollToRueckruf}
          >
            Beratung anfragen
          </button>
        </div>
      ) : karteNeubauenStil ? (
        <div className="komplex-card">
          <h2>Das planen wir persönlich mit dir.</h2>
          <p>
            Für dieses Projekt gibt es zu viele individuelle Faktoren für eine
            automatische Kalkulation. Wir schauen es uns gemeinsam an und
            erstellen dir ein konkretes Angebot — kostenlos und unverbindlich.
          </p>
          <button
            type="button"
            className="komplex-card-cta"
            onClick={scrollToRueckruf}
          >
            Jetzt Beratung anfragen
          </button>
        </div>
      ) : (
        <div className="komplex-header">
          <div className="komplex-icon" aria-hidden>
            💬
          </div>
          <h2 className="komplex-headline">
            Dein Projekt startet ab ca. {formatCurrencyEUR(abMin)}.
          </h2>
          <p className="komplex-sub">
            {fassadeDaemmungKomplex ? (
              <>
                Fassadendämmung planen wir persönlich mit dir — ein kurzes
                Gespräch hilft uns, den nächsten Schritt festzulegen.
              </>
            ) : (
              <>
                Für einen finalen Preis kommen wir um einen Vor-Ort-Termin
                nicht herum.
              </>
            )}
          </p>
        </div>
      )}

      <div id="komplex-rueckruf-anchor" className="h-px w-full scroll-mt-24" />

      <div className="komplex-option">
        <div className="komplex-option-label">Sofort sprechen</div>
        <a
          href={SITE_CONFIG.phoneHref}
          className="komplex-call-btn komplex-call-btn--hero"
        >
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
            placeholder="+49 151 23456789"
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

      {onReset ? <NeueAnfrageResetLink onClick={onReset} /> : null}
    </div>
  );
}

export function BwResultScreen({
  state,
  mindestauftragAktiv,
  resultModus,
  schwellenwertAusgeloest = false,
  onKomplexRueckrufSuccess,
  onReset,
  className,
}: BwResultScreenProps) {
  const [emailSaveOpen, setEmailSaveOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveEmailSent, setSaveEmailSent] = useState(false);
  const [saveEmailError, setSaveEmailError] = useState("");

  const notfallAkut =
    state.situation === "notfall" && state.dringlichkeit === "sofort";

  if (notfallAkut) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="relative overflow-hidden rounded-[18px] bg-surface-dark p-6 text-center text-white">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
              <span aria-hidden>⚡</span> Dringend
            </span>
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-widest text-white/70">
            Notfall
          </p>
          <p className="mt-3 text-base leading-snug text-white/90">
            Typischer Einsatz:{" "}
            <strong className="text-white">150–600 €</strong>
          </p>
          <p className="mt-2 text-sm text-white/80">
            Für akute Fälle ruf uns direkt an.
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            className="bw-akut-tel-btn mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-funnel-accent px-5 py-4 text-lg font-bold text-white shadow-lg transition-opacity hover:opacity-95"
          >
            <PhoneIconKomplex />
            {SITE_CONFIG.phone}
          </a>
          <div className="notfall-trust mt-5 space-y-2 text-left text-sm text-white/90">
            <div className="notfall-trust-item">✓ Schnelle Rückmeldung</div>
            <div className="notfall-trust-item">
              ✓ Wir sind in München & Umgebung
            </div>
            <div className="notfall-trust-item">✓ Transparente Preise</div>
          </div>
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
        onReset={onReset}
        className={className}
      />
    );
  }

  const hasRange = state.priceMin > 0 && state.priceMax > 0;

  const showVergleichHint =
    hasRange &&
    state.situation !== "notfall" &&
    resultModus !== "notfall_akut" &&
    (resultModus === "preisrahmen" ||
      resultModus === "preisrahmen_warnung" ||
      resultModus === undefined);

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
    <div className={cn("bw-result-screen", className)}>
      {hasRange ? (
        <div className="preis-karte">
          <p className="preis-karte-kicker">Dein Preisrahmen</p>
          <div className="preis-karte-range">
            <span className="preis-karte-zahl">
              {formatCurrencyEUR(state.priceMin)}
            </span>
            <span className="preis-karte-trenner">–</span>
            <span className="preis-karte-zahl">
              {formatCurrencyEUR(state.priceMax)}
            </span>
          </div>
          <ResultEinordnung state={state} />

          {state.istFallback ? (
            <p className="preis-karte-fallback">
              Für deine Auswahl nutzen wir allgemeine Münchner Marktpreise — beim
              Vor-Ort-Termin nennen wir dir einen genauen Preis.
            </p>
          ) : null}
          {resultModus === "preisrahmen_warnung" ? (
            <p className="preis-karte-warn-einzeiler">
              Größeres Projekt: der finale Preis kann stärker abweichen — Festpreis
              nach Vor-Ort-Termin.
            </p>
          ) : null}
          {state.situation === "notfall" ? (
            <>
              <a
                href={SITE_CONFIG.phoneHref}
                className="komplex-call-btn komplex-call-btn--hero mt-5 w-full max-w-sm"
              >
                <PhoneIconKomplex />
                {SITE_CONFIG.phone}
              </a>
              <div className="notfall-trust mt-4 space-y-2 text-left text-sm text-text-secondary">
                <div className="trust-item flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>Schnelle Rückmeldung</span>
                </div>
                <div className="trust-item flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>Wir sind in München & Umgebung</span>
                </div>
                <div className="trust-item flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>Transparente Preise</span>
                </div>
              </div>
            </>
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
          Basiert auf Münchner Marktpreisen 2026 — verbindliches
          Festpreisangebot nach Vor-Ort-Termin.
        </p>
      ) : null}

      {showVergleichHint ? (
        <div className="vergleich-hint">
          <p className="vergleich-hint-text">
            Haben Sie bereits ein günstigeres Angebot erhalten? Laden Sie es im
            nächsten Schritt einfach hoch — wir prüfen es ehrlich und sagen Ihnen
            ob wir mithalten können.
          </p>
        </div>
      ) : null}

      {mindestauftragAktiv && hasRange ? (
        <p className="result-meta-einzeiler">
          Mindestauftrag 150 € inkl. Anfahrt und erster Einschätzung vor Ort.
        </p>
      ) : null}

      {hasRange && !state.istFallback && getAktiveGewerke(state).length > 1 ? (
        <p className="koordination-hint mt-4 text-center text-sm leading-snug text-text-secondary">
          Wir koordinieren alle {getAktiveGewerke(state).length} Gewerke — ein
          Ansprechpartner, eine Rechnung.
        </p>
      ) : null}

      {hasRange ? <ResultTestimonialCard /> : null}

      {hasRange ? (
        <p className="result-trust-inline">
          ✓ Meisterbetriebe München · ✓ Ein Ansprechpartner · ✓ Anfahrt bei
          Auftrag angerechnet
        </p>
      ) : null}

      {hasRange && !saveEmailSent ? (
        <div className="preis-save-wrap preis-save-wrap--compact">
          {!emailSaveOpen ? (
            <button
              type="button"
              className="preis-save-trigger"
              onClick={() => setEmailSaveOpen(true)}
            >
              <EnvelopeIcon16 />
              Preisrahmen per E-Mail
            </button>
          ) : (
            <div className="preis-save-form">
              <p className="preis-save-label">
                Wir schicken dir den Preisrahmen zu — kein Spam.
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
          Gesendet — bitte Postfach prüfen.
        </div>
      ) : null}

      {hasRange ? (
        <div
          id="lead-form"
          className="pointer-events-none h-px w-full scroll-mt-24 opacity-0"
          aria-hidden
        />
      ) : null}

      {onReset ? <NeueAnfrageResetLink onClick={onReset} /> : null}
    </div>
  );
}
