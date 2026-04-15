"use client";

import { useCallback, useMemo, useState } from "react";

import { formatCurrencyEUR } from "@/lib/price-calc";
import { getResolvedStepsForSituation } from "@/lib/funnel/config";
import type { FunnelState, ObjektZustand, PriceLineItem } from "@/lib/funnel/types";
import {
  calculatePrice,
  getBwResultModus,
  type BwResultModus,
} from "@/lib/funnel/price-calc";
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

const LEISTUNGS_LABELS: Record<string, string> = {
  "sanitaer.verstopfung": "Rohrreinigung",
  "sanitaer.leck": "Leck / Rohrbruch",
  "sanitaer.wc": "WC / Heizung",
  "sanitaer.armatur": "Armatur / Bad",
  "elektro.steckdose": "Elektro (einzelne Punkte)",
  "elektro.fi_schalter": "Elektrik erneuern",
  "elektro.fehlersuche": "Elektro Fehlersuche",
  "elektro.qm": "Elektrik (nach Fläche)",
  "elektro.punkte": "Elektro (einzelne Punkte)",
  "garten.rasen": "Rasenpflege",
  "garten.hecke": "Heckenschnitt",
  "garten.pflaster": "Pflaster / Terrasse",
  "maler.waende": "Wände streichen",
  "maler.waende_decke": "Wände + Decke streichen",
  "maler.fassade": "Fassade streichen",
  "boden.laminat": "Laminat verlegen",
  "boden.parkett": "Parkett verlegen",
  "boden.vinyl": "Vinyl / Designboden",
  "boden.fliesen": "Fliesen verlegen",
  "boden.teppich": "Teppich verlegen",
  "bad.fliesen": "Bad fliesen",
  "bad.komplett": "Bad komplett",
  "bad.objekte": "Sanitärobjekte",
  "heizung.gas": "Heizung (Gas)",
  "heizung.wartung": "Heizungswartung",
  "dach.ziegel": "Dach reparieren",
  "dach.komplett": "Dach sanieren",
  "dach.regenrinne": "Regenrinne",
  "fassade.anstrich": "Fassade streichen",
  "fassade.daemmung": "Fassade / Dämmung",
  "fenster.standard": "Fenster / Türen",
  "kueche.aufbau": "Küche Montage",
  "ausbau.umbau": "Ausbau / Umbau",
  "terrasse.aussen": "Terrasse / Außen",
  "gartenpflege.saison": "Gartenpflege",
  "gartengestaltung.einmal": "Gartengestaltung",
  "baum.pflege": "Baumpflege",
  "wasser.einsatz": "Wasser & Rohre",
  "reinigung.regelmaessig": "Reinigung",
  "reinigung.einmalig": "Reinigung",
  "allgemein.allgemein": "Handwerksleistung",
};

const GEWERK_SERVICE_SLUG: Record<string, string> = {
  Sanitär: "sanitaer",
  Elektro: "elektro",
  Garten: "garten",
  Maler: "maler",
  Boden: "boden",
  Bad: "bad",
  Heizung: "heizung",
  Dach: "dach",
  Küche: "kueche",
  Kueche: "kueche",
  Fassade: "fassade",
  Fenster: "fenster",
  Reinigung: "reinigung",
  Gartenpflege: "gartenpflege",
  Gartengestaltung: "gartengestaltung",
  Baumpflege: "baum",
  Ausbau: "ausbau",
  "Terrasse / Außen": "terrasse",
  "Wasser & Rohre": "wasser",
};

function beschreibungToTypeSlug(
  beschreibung: string,
  gewerk: string
): string {
  const b = beschreibung.trim().toLowerCase();

  if (gewerk === "Bad") {
    if (b.includes("komplett")) return "komplett";
    if (b.includes("einzelobj") || b.includes("sanitärobj")) return "objekte";
    if (b.includes("fliesen")) return "fliesen";
    if (b.includes("badsanierung")) return "fliesen";
    return "fliesen";
  }
  if (gewerk === "Boden") {
    if (b.includes("laminat")) return "laminat";
    if (b.includes("parkett")) return "parkett";
    if (b.includes("vinyl") || b.includes("designboden")) return "vinyl";
    if (b.includes("fliesen")) return "fliesen";
    if (b.includes("teppich")) return "teppich";
    return "vinyl";
  }
  if (gewerk === "Maler") {
    if (b.includes("decke")) return "waende_decke";
    if (b.includes("wände") || b.includes("wand")) return "waende";
    return "waende";
  }
  if (gewerk === "Fassade") {
    if (b.includes("außen") || b.includes("aussen")) return "fassade";
    if (b.includes("dämmung") || b.includes("daemmung")) return "daemmung";
    if (b.includes("anteil")) return "daemmung";
    if (b.includes("fassadenfläche") || b.includes("anstrich")) return "anstrich";
    return "anstrich";
  }
  if (gewerk === "Heizung") {
    if (b.includes("wartung") || b.includes("notfall")) return "wartung";
    return "gas";
  }
  if (gewerk === "Dach") {
    if (b.includes("ziegel")) return "ziegel";
    if (b.includes("regenrinne") || b.includes("ablauf")) return "regenrinne";
    return "komplett";
  }
  if (gewerk === "Elektro") {
    if (b.includes("fehlersuche")) return "fehlersuche";
    if (b.includes("fi") || b.includes("sicherungs")) return "fi_schalter";
    if (b.includes("fläche") || b.includes("nach fläche")) return "qm";
    if (b.includes("punkt") || b.includes("arbeitspunkt")) return "punkte";
    if (b.includes("steckdose")) return "steckdose";
    return "qm";
  }
  if (gewerk === "Sanitär") {
    if (b.includes("verstopf")) return "verstopfung";
    if (b.includes("leck") || b.includes("rohr")) return "leck";
    if (b.includes("armatur") || b.includes("einzelteil")) return "armatur";
    if (b.includes("warmwasser") || b.includes("wc")) return "wc";
    return "armatur";
  }
  if (gewerk === "Garten") {
    if (b.includes("rasen")) return "rasen";
    if (b.includes("hecke")) return "hecke";
    if (b.includes("pflaster") || b.includes("terrasse")) return "pflaster";
    return "rasen";
  }
  if (gewerk === "Küche" || gewerk === "Kueche") {
    return "aufbau";
  }
  if (gewerk === "Fenster") {
    if (b.includes("dachfenster")) return "standard";
    return "standard";
  }
  if (gewerk === "Gartenpflege") return "saison";
  if (gewerk === "Gartengestaltung") return "einmal";
  if (gewerk === "Baumpflege") return "pflege";
  if (gewerk === "Ausbau") return "umbau";
  if (gewerk === "Terrasse / Außen") return "aussen";
  if (gewerk === "Wasser & Rohre") return "einsatz";
  if (gewerk === "Reinigung") {
    if (b.includes("einmal")) return "einmalig";
    return "regelmaessig";
  }

  if (b.includes("verstopf")) return "verstopfung";
  if (b.includes("leck")) return "leck";
  if (b.includes("steckdose")) return "steckdose";
  if (b.includes("fi ")) return "fi_schalter";
  if (b.includes("fehlersuche")) return "fehlersuche";
  if (b.includes("rasen")) return "rasen";
  if (b.includes("hecke")) return "hecke";
  if (b.includes("pflaster")) return "pflaster";
  if (b.includes("wände + decke") || b.includes("waende + decke"))
    return "waende_decke";
  if (b.includes("wände streichen")) return "waende";
  if (b.includes("fassade")) return "anstrich";
  if (b.includes("laminat")) return "laminat";
  if (b.includes("parkett")) return "parkett";
  if (b.includes("vinyl")) return "vinyl";
  if (b.includes("fliesen boden")) return "fliesen";
  if (b.includes("fliesen")) return "fliesen";
  if (b.includes("teppich")) return "teppich";
  if (b.includes("bad — fliesen") || b.includes("bad fliesen")) return "fliesen";
  if (b.includes("komplettsanierung")) return "komplett";
  if (b.includes("sanitärobj")) return "objekte";
  if (b.includes("gasheizung")) return "gas";
  if (b.includes("wartung")) return "wartung";
  if (b.includes("ziegel")) return "ziegel";
  if (b.includes("dach komplett")) return "komplett";
  if (b.includes("regenrinne")) return "regenrinne";
  if (b.includes("montage")) return "aufbau";

  return "allgemein";
}

function serviceSlugForLine(item: PriceLineItem): string {
  const g = item.gewerk;
  const b = item.beschreibung.toLowerCase();
  if (g === "Fassade" && (b.includes("außen") || b.includes("aussen")))
    return "maler";
  return GEWERK_SERVICE_SLUG[g] ?? g.toLowerCase().replace(/\s+/g, "_");
}

function getLeistungsLabel(gewerk: string, type: string): string {
  const key = `${gewerk}.${type}`;
  return LEISTUNGS_LABELS[key] ?? `${gewerk} — ${type}`;
}

function lineLeistungsLabel(item: PriceLineItem): string {
  const slug = serviceSlugForLine(item);
  const type = beschreibungToTypeSlug(item.beschreibung, item.gewerk);
  const key = `${slug}.${type}`;
  return (
    LEISTUNGS_LABELS[key] ??
    (item.beschreibung.trim() || getLeistungsLabel(slug, type))
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

function PreisAccordion({
  state,
  koordinationsRabatt,
}: {
  state: FunnelState;
  koordinationsRabatt: number;
}) {
  const [open, setOpen] = useState(false);

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
        <span>Preisdetails ansehen</span>
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
                  <td>{lineLeistungsLabel(item)}</td>
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
        </div>
      ) : null}
    </div>
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

function zustandEinordnungLabel(z: ObjektZustand | null): string | null {
  if (!z) return null;
  if (z === "gut") return "Gepflegt";
  if (z === "mittel") return "Normale Abnutzung";
  if (z === "unknown") return "Weiß ich nicht";
  return "Sanierungsbedürftig";
}

function groesseEinordnungLine(state: FunnelState): string | null {
  if (state.groesse == null) return null;
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
  const zLine = zustandEinordnungLabel(state.zustand);
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

  const preisPreview = useMemo(
    () => calculatePrice(state, { preview: true }),
    [state]
  );
  const abMin = preisPreview.min > 0 ? preisPreview.min : 1200;

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
        <h2 className="komplex-headline">
          Dein Projekt startet ab ca. {formatCurrencyEUR(abMin)}.
        </h2>
        <p className="komplex-sub">
          Für einen seriösen Preis kommen wir um einen Vor-Ort-Termin nicht
          herum.
        </p>
      </div>

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
  mindestauftragAktiv,
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

  const notfallAkut =
    state.situation === "notfall" && state.dringlichkeit === "akut";

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
          <p className="mt-3 text-xs text-white/60">
            Mobil · Büro:{" "}
            <a
              href={SITE_CONFIG.phoneFestnetHref}
              className="underline decoration-white/40 underline-offset-2"
            >
              {SITE_CONFIG.phoneFestnetz}
            </a>
          </p>
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
        </div>
      ) : (
        <div className="rounded-[18px] border border-border-default bg-muted p-5 text-center text-sm text-text-secondary">
          Für deine Angaben ergibt sich kein automatischer Preisrahmen — wir
          melden uns persönlich.
        </div>
      )}

      {hasRange ? (
        <p className="preis-disclaimer">
          Unverbindlicher Richtwert — Festpreis nach Vor-Ort-Termin.
        </p>
      ) : null}

      {mindestauftragAktiv && hasRange ? (
        <p className="result-meta-einzeiler">
          Mindestauftrag 150 € inkl. Anfahrt und erster Einschätzung vor Ort.
        </p>
      ) : null}

      {hasRange && !state.istFallback ? (
        <PreisAccordion state={state} koordinationsRabatt={koordinationsRabatt} />
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
    </div>
  );
}
