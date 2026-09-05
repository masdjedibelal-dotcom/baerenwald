"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import "@/app/funnel-ui.css";

import { FachdetailsStep } from "@/components/funnel/FachdetailsStep";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { getMeldeFotoBeispiele } from "@/lib/funnel/melde-foto-beispiel";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalKiAssistField } from "@/components/shared/PortalKiAssistField";
import {
  buildBwLeadPayload,
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import {
  BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND,
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
  buildZustandStepForBereiche,
  getZustandDisplayLabel,
  SITUATIONEN_CONFIG,
} from "@/lib/funnel/config";
import {
  getActiveFachdetailQuestionIds,
  getActiveFachdetailQuestions,
} from "@/lib/funnel/fachdetail-questions-flat";
import {
  funnelVariant,
  type FunnelChannel,
} from "@/lib/funnel/funnel-variant";
import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import {
  getMeldeKaputtFachfragen,
  isMeldeKaputtChannel,
  MELDE_KAPUTT_BEREICH_OPTIONS,
} from "@/lib/funnel/melde-kaputt-flow";
import {
  isMeldeDirektauftrag,
  meldeKategorieForDirektauftragFlow,
} from "@/lib/funnel/melde-direktauftrag";
import { ALL_AKUT_FALL_IDS } from "@/lib/org/sofortmassnahme-faelle";
import { bewohnerInMieterZuordnung } from "@/lib/org/einheit-bewohner-regeln";
import { calculatePrice, isBwZuKomplexErgebnis } from "@/lib/funnel/price-calc";
import {
  applyGroesseStepCopy,
  getGroesseConfig,
  groesseEinheitFromConfig,
} from "@/lib/funnel/groesse-config";
import { skipGroesseForSanierenDachKleinjob } from "@/lib/funnel/dach-step-order";
import {
  findResolvedGroesseStep,
  findResolvedStepDef,
  getPortalResolvedFunnelSteps,
  isPortalFunnelMidStepId,
  mapResolvedStepsToPortalMid,
  portalMidStepLabel,
  portalProjektStepAnswered,
  shouldUseWebsiteMidSteps,
  type PortalFunnelMidStepId,
} from "@/lib/funnel/portal-funnel-mid-steps";
import { GroesseStep } from "@/components/funnel/GroesseStep";
import { mapMeldeToPrice, compactFachdetailAnswers } from "@/lib/org/map-melde-to-price";
import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import type {
  FachdetailsState,
  FunnelState,
  ObjektZustand,
  Situation,
  Zugaenglichkeit,
} from "@/lib/funnel/types";
import { BW_FUNNEL_INITIAL_STATE } from "@/hooks/funnel/useFunnelState";
import { track } from "@/lib/analytics";
import { formatCurrencyEUR } from "@/lib/price-calc";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import type { StepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PortalFunnelObjekt = {
  id: string;
  titel: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  melde_slug?: string | null;
  /** Optional: Einheiten für SE-Gate / Auswahl (Eigentümer-Portal). */
  einheiten?: Array<{ id: string; label: string; etage?: string | null }>;
};

export type PortalFunnelMeldeCtx = {
  orgKennung: string;
  objektSlug: string;
  orgName: string;
  sessionKey: string;
  /** Einladung ergänzen statt neuer Meldung */
  ergaenzenToken?: string;
  /** Kein oder unvollständiges Objekt → Adresse im Kontaktschritt (immer für Melde-Link) */
  needsAddress?: boolean;
  /** Zurück darf nicht zur HV-Objektliste führen */
  objektLocked?: boolean;
  /** Anzeige in der Zusammenfassung */
  objektTitel?: string | null;
  objektAdresse?: string | null;
  /** Rechtslinks: Verwaltung (nicht Website-Bärenwald) */
  datenschutzHref?: string;
  impressumHref?: string;
  /** HV-Whitelist Sofortmaßnahme; leer = nichts geht direkt (UI). */
  akutFallIds?: readonly string[];
};

export type PortalFunnelPrefill = {
  name?: string;
  email?: string;
  telefon?: string;
  objektId?: string;
  einheit?: string;
  plz?: string;
  strasse?: string;
  hausnummer?: string;
  ort?: string;
};

type HvMieterOption = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  einheitLabel?: string | null;
};

type StepId =
  | "objekt"
  | "objekt_neu"
  | "mieter"
  | "mieter_neu"
  | "situation"
  | "bereiche"
  | "dringlichkeit"
  | "fachdetail"
  | "groesse"
  | PortalFunnelMidStepId
  | "medien"
  | "beschreibung"
  | "kontakt"
  | "result";

function asLibOpt(opt: {
  value: string;
  label: string;
  hint?: string;
  icon?: string;
}): StepOption {
  return {
    value: opt.value,
    label: opt.label,
    hint: opt.hint,
    icon: opt.icon,
  };
}

function portalPriceIsReliable(
  price: {
    min: number;
    max: number;
    resultModus?: string;
    komplexReason?: string | null;
  } | null
): boolean {
  if (!price) return false;
  if (price.min <= 0 && price.max <= 0) return false;
  if (price.resultModus === "zu_komplex") return false;
  if (price.komplexReason === "no_mapping_found") return false;
  return true;
}

type Props = {
  channel: FunnelChannel;
  title?: string;
  objekte?: PortalFunnelObjekt[];
  prefill?: PortalFunnelPrefill;
  /** Anonymer Melde-Kontext (Submit → /api/meldung). */
  melde?: PortalFunnelMeldeCtx;
  onClose: () => void;
  onDone: () => void;
  /** Nach Objekt-Neuanlage (HV) — Parent kann Liste refreshen. */
  onObjekteChanged?: (objekte: PortalFunnelObjekt[]) => void;
  /**
   * `modal` = Portal-Create (kompakte Steps, füllt Modal).
   * `page` = Melde-Seite (wie Rechner-Abstand).
   */
  layout?: "modal" | "page";
};

function bereicheOptions(
  situation: Situation,
  meldeKaputt: boolean
): StepOption[] {
  if (meldeKaputt && situation === "kaputt") {
    return MELDE_KAPUTT_BEREICH_OPTIONS.map((o) => ({
      value: o.bereich === "elektro" ? "elektro" : o.bereich,
      label: o.label,
      hint: o.hint,
      icon: o.icon,
    }));
  }
  const steps = SITUATIONEN_CONFIG[situation]?.steps ?? [];
  const s = steps.find((x) => x.id.includes("bereiche"));
  return (s?.options ?? []) as StepOption[];
}

function dringlichkeitOptions(opts?: { stripSlaCopy?: boolean }): StepOption[] {
  const steps = SITUATIONEN_CONFIG.kaputt.steps;
  const s = steps.find((x) => x.id === "kaputt_dringlichkeit");
  const raw = (s?.options ?? []) as Array<
    StepOption & { infoText?: string; warnText?: string }
  >;
  if (!opts?.stripSlaCopy) return raw;
  // Melde / HV-intern: keine Zeitversprechen zu Terminen
  return raw.map((o) => {
    const { infoText: _i, warnText: _w, infoExpand: _e, ...rest } = o as StepOption & {
      infoText?: string;
      warnText?: string;
      infoExpand?: string;
    };
    return rest;
  });
}

function optionLabel(options: StepOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function fachAnswerLabel(
  optionen: Array<{ value: string; label: string }>,
  raw: string | string[] | undefined
): string {
  if (raw == null || raw === "") return "—";
  const values = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (values.length === 0) return "—";
  return values
    .map((v) => optionen.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}

type SummaryRow = { label: string; value: string };

/**
 * Gemeinsamer Portal-/Melde-Funnel auf Basis Website-Design.
 * Trust/GPT entfallen; Felder und Preis je `funnelVariant(channel)`.
 */
export function PortalFunnelHost({
  channel,
  objekte: objekteProp = [],
  prefill,
  melde,
  onClose,
  onDone,
  onObjekteChanged,
  layout = "modal",
}: Props) {
  const router = useRouter();
  const cfg = funnelVariant(channel);
  const [objekte, setObjekte] = useState(objekteProp);
  const stepLayout = layout === "page" ? "page" : "modal";
  const meldeAkutFallIds = melde?.akutFallIds ?? [];

  const initialSituation: Situation | null = cfg.forceKaputt
    ? "kaputt"
    : null;

  const [step, setStep] = useState<StepId>(() => {
    if (
      cfg.prefix.objekt === "required" ||
      cfg.prefix.objekt === "optional"
    ) {
      return "objekt";
    }
    if (
      cfg.prefix.mieter === "required" ||
      cfg.prefix.mieter === "optional" ||
      cfg.prefix.mieter === "ohne_erlaubt"
    ) {
      return "mieter";
    }
    if (!cfg.forceKaputt) return "situation";
    return "bereiche";
  });

  const [objektId, setObjektId] = useState(
    prefill?.objektId ?? objekte[0]?.id ?? ""
  );
  const [ohneMieter, setOhneMieter] = useState(
    cfg.prefix.mieter === "ohne_erlaubt" || cfg.prefix.mieter === "hidden"
  );
  const [mieterMode, setMieterMode] = useState<"ohne" | "liste" | "neu">(
    cfg.prefix.mieter === "ohne_erlaubt" || cfg.prefix.mieter === "hidden"
      ? "ohne"
      : "neu"
  );
  const [mieterVorname, setMieterVorname] = useState("");
  const [mieterNachname, setMieterNachname] = useState("");
  const [mieterName, setMieterName] = useState(prefill?.name ?? "");
  const [mieterEmail, setMieterEmail] = useState(prefill?.email ?? "");
  const [mieterTel, setMieterTel] = useState(prefill?.telefon ?? "");
  const [mieterStrasse, setMieterStrasse] = useState(prefill?.strasse ?? "");
  const [mieterHausnummer, setMieterHausnummer] = useState(
    prefill?.hausnummer ?? ""
  );
  const [mieterPlz, setMieterPlz] = useState(prefill?.plz ?? "");
  const [mieterOrt, setMieterOrt] = useState("");
  const [einheit, setEinheit] = useState(prefill?.einheit ?? "");
  const [hvMieterListe, setHvMieterListe] = useState<HvMieterOption[]>([]);
  const [selectedMieterId, setSelectedMieterId] = useState<string | null>(null);
  /** HV-Melde: Akut/Sofortmaßnahme — Vorschlag aus Fachfragen, am Ende überschreibbar. */
  const [hvAkut, setHvAkut] = useState(false);

  const mieterVollname = useMemo(() => {
    const fromParts = [mieterVorname, mieterNachname]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    return fromParts || mieterName.trim();
  }, [mieterVorname, mieterNachname, mieterName]);

  const resetMieterNeuForm = useCallback(
    (fromObjekt?: PortalFunnelObjekt | null) => {
      setMieterVorname("");
      setMieterNachname("");
      setMieterName("");
      setMieterEmail("");
      setMieterTel("");
      setEinheit("");
      setMieterStrasse(fromObjekt?.strasse?.trim() || "");
      setMieterHausnummer(fromObjekt?.hausnummer?.trim() || "");
      setMieterPlz(fromObjekt?.plz?.trim() || "");
      setMieterOrt(fromObjekt?.ort?.trim() || "");
    },
    []
  );

  const loadHvMieterListe = useCallback(async (oid: string) => {
    const res = await fetch(
      `/api/org/einheit-bewohner?objektId=${encodeURIComponent(oid)}`
    );
    const json = (await res.json()) as {
      bewohner?: Array<{
        id: string;
        name: string;
        email?: string | null;
        telefon?: string | null;
        rolle?: string | null;
        selbstbewohnt?: boolean | null;
        objekt_einheiten?: { bezeichnung?: string | null } | null;
      }>;
    };
    return (json.bewohner ?? [])
      .filter((b) => bewohnerInMieterZuordnung(b))
      .map((b) => {
        const selbst =
          String(b.rolle ?? "").toLowerCase() === "eigentuemer" &&
          Boolean(b.selbstbewohnt);
        const einheit = b.objekt_einheiten?.bezeichnung ?? null;
        return {
          id: b.id,
          name: b.name,
          email: b.email,
          telefon: b.telefon,
          einheitLabel: selbst
            ? [einheit, "Eigentümer selbstbewohnt"].filter(Boolean).join(" · ")
            : einheit,
        };
      }) satisfies HvMieterOption[];
  }, []);

  const mieterKontaktOk = useCallback(() => {
    const nameOk =
      mieterVollname.length > 1 ||
      (mieterVorname.trim().length > 0 && mieterNachname.trim().length > 0);
    if (channel === "portal_hv") {
      return (
        mieterVorname.trim().length > 0 &&
        mieterNachname.trim().length > 0 &&
        mieterStrasse.trim().length > 1 &&
        mieterHausnummer.trim().length > 0
      );
    }
    return (
      nameOk &&
      mieterEmail.trim().includes("@") &&
      mieterStrasse.trim().length > 1 &&
      mieterHausnummer.trim().length > 0 &&
      mieterPlz.trim().length >= 4 &&
      mieterOrt.trim().length > 1
    );
  }, [
    channel,
    mieterVollname,
    mieterVorname,
    mieterNachname,
    mieterEmail,
    mieterStrasse,
    mieterHausnummer,
    mieterPlz,
    mieterOrt,
  ]);

  const [neuTitel, setNeuTitel] = useState("");
  const [neuStrasse, setNeuStrasse] = useState("");
  const [neuHausnummer, setNeuHausnummer] = useState("");
  const [neuPlz, setNeuPlz] = useState("");
  const [neuOrt, setNeuOrt] = useState("");
  const [neuBusy, setNeuBusy] = useState(false);

  const [state, setState] = useState<FunnelState>(() => ({
    ...BW_FUNNEL_INITIAL_STATE,
    situation: initialSituation,
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    telefon: prefill?.telefon ?? "",
    plz: prefill?.plz ?? "",
    strasse: prefill?.strasse ?? "",
    hausnummer: prefill?.hausnummer ?? "",
    ort: prefill?.ort ?? "",
    kundentyp:
      channel === "portal_hv"
        ? "hausverwaltung"
        : channel === "portal_mieter" || channel === "melde_anon"
          ? "mieter"
          : "eigentuemer",
  }));

  const [fachIdx, setFachIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regelnOk, setRegelnOk] = useState(false);

  const objekt = objekte.find((o) => o.id === objektId) ?? null;
  const isHvIntern = channel === "portal_hv";
  /** HV mit zugeordnetem Mieter: Fragen wie Mieter-Melde (Ich/Sie in der Wohnung). */
  const hvMitMieter = isHvIntern && mieterMode !== "ohne";
  /** HV ohne Mieter: neutrale Verwalter-Formulierungen. */
  const meldeFrageVoice =
    isHvIntern && !hvMitMieter ? ("verwaltung" as const) : ("mieter" as const);
  /** Melde / Mieter / HV-kaputt: kurze Ja/Nein-Fragen, kein Dringlichkeits-Schritt. */
  const useMeldeKaputtFlow =
    isMeldeKaputtChannel(channel) && state.situation === "kaputt";
  /** Melde / Mieter / HV / Privat / Eigentümer: keine Termin-/SLA-Infoboxen. */
  const stripTerminInfos =
    channel === "melde_anon" ||
    channel === "portal_mieter" ||
    channel === "portal_privat" ||
    channel === "portal_eigentuemer" ||
    isHvIntern;

  useEffect(() => {
    if (!isHvIntern || !objektId) {
      setHvMieterListe([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await loadHvMieterListe(objektId);
        if (!cancelled) setHvMieterListe(list);
      } catch {
        if (!cancelled) setHvMieterListe([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHvIntern, objektId, loadHvMieterListe]);

  const meldeFachfragen = useMemo(() => {
    if (!useMeldeKaputtFlow) return [];
    const b = state.bereiche[0];
    if (!b) return [];
    return getMeldeKaputtFachfragen(
      b,
      state.fachdetails?.fachdetailAnswers,
      meldeFrageVoice
    );
  }, [
    useMeldeKaputtFlow,
    state.bereiche,
    state.fachdetails?.fachdetailAnswers,
    meldeFrageVoice,
  ]);

  /** Automatischer Akut-Vorschlag (Fachfragen) — nur HV-Melde-Flow. */
  const suggestedHvAkut = useMemo(() => {
    if (!isHvIntern || !useMeldeKaputtFlow) return false;
    const b = state.bereiche[0];
    if (!b) return false;
    return isMeldeDirektauftrag(
      kaputtBereichToMeldeId(b),
      state.fachdetails?.fachdetailAnswers ?? {},
      ALL_AKUT_FALL_IDS
    );
  }, [
    isHvIntern,
    useMeldeKaputtFlow,
    state.bereiche,
    state.fachdetails?.fachdetailAnswers,
  ]);

  useEffect(() => {
    if (!isHvIntern || !useMeldeKaputtFlow) return;
    setHvAkut(suggestedHvAkut);
  }, [isHvIntern, useMeldeKaputtFlow, suggestedHvAkut]);

  const fachIds = useMemo(() => {
    if (useMeldeKaputtFlow) return meldeFachfragen.map((q) => q.id);
    return getActiveFachdetailQuestionIds(state);
  }, [useMeldeKaputtFlow, meldeFachfragen, state]);
  const currentFachId = fachIds[fachIdx] ?? null;
  const currentMeldeFrage = useMeldeKaputtFlow
    ? meldeFachfragen.find((q) => q.id === currentFachId) ?? null
    : null;

  /** Nächster Schritt nach Fachdetails — auch wenn `fachdetail` aus der Order gefallen ist. */
  const stepAfterFachdetail = useCallback(
    (order: StepId[]): StepId | null => {
      const afterFach = order.indexOf("fachdetail");
      if (afterFach >= 0) return order[afterFach + 1] ?? null;
      const fallback: StepId[] = [
        "groesse",
        "bad_ausstattung",
        "zugaenglichkeit",
        "zustand",
        "medien",
        "beschreibung",
        "kontakt",
        "result",
      ];
      return fallback.find((id) => order.includes(id)) ?? null;
    },
    []
  );

  const resolvedWebsiteSteps = useMemo(
    () => getPortalResolvedFunnelSteps(state),
    [state]
  );

  const groesseConfig = useMemo(() => {
    if (!state.situation || state.bereiche.length === 0) return null;
    if (useMeldeKaputtFlow) return null;
    if (skipGroesseForSanierenDachKleinjob(state.fachdetails)) return null;
    /** Nur wenn Website-Sequenz einen Größen-Schritt enthält. */
    if (
      shouldUseWebsiteMidSteps(state.situation, useMeldeKaputtFlow) &&
      !findResolvedGroesseStep(resolvedWebsiteSteps)
    ) {
      return null;
    }
    return getGroesseConfig(state);
  }, [state, useMeldeKaputtFlow, resolvedWebsiteSteps]);

  const groesseStepCopy = useMemo(() => {
    if (!state.situation || !groesseConfig) return null;
    const raw =
      findResolvedGroesseStep(resolvedWebsiteSteps) ??
      ({
        id: "groesse",
        question: "Wie groß ist die Fläche ungefähr?",
        subtext: groesseConfig.einheit,
        inputType: "tiles-single" as const,
      });
    return applyGroesseStepCopy(
      raw,
      state.situation,
      state.bereiche,
      state.fachdetails
    );
  }, [state, groesseConfig, resolvedWebsiteSteps]);

  const zustandStepDef = useMemo(() => {
    if (!state.situation || state.bereiche.length === 0) return null;
    return buildZustandStepForBereiche(state.bereiche);
  }, [state.situation, state.bereiche]);

  const price = useMemo(() => {
    if (!cfg.showPrice || !state.situation || state.bereiche.length === 0) {
      return null;
    }
    const plz =
      state.plz.trim() ||
      objekt?.plz?.trim() ||
      prefill?.plz?.trim() ||
      "80331";

    if (useMeldeKaputtFlow) {
      const bereichId = kaputtBereichToMeldeId(state.bereiche[0] ?? "sonstiges");
      const answers = state.fachdetails?.fachdetailAnswers ?? {};
      const direktauftrag = isHvIntern
        ? hvAkut
        : isMeldeDirektauftrag(bereichId, answers, meldeAkutFallIds);
      const kategorie = meldeKategorieForDirektauftragFlow(
        bereichId,
        direktauftrag
      );
      const mapped = mapMeldeToPrice({
        kategorie,
        bereichId,
        plz,
        fachdetailAnswers: answers,
        dringlichkeit: direktauftrag ? "sofort" : "diese_woche",
      });
      if (mapped.preis_unsicher || mapped.preis_min == null) return null;
      return {
        min: mapped.preis_min,
        max: mapped.preis_max ?? mapped.preis_min,
        resultModus: "ok" as const,
        istFallback: false,
        komplexReason: null as string | null,
      };
    }

    // Ohne benötigte Größe keinen Fake-Preis aus groesse??1
    if (groesseConfig && (state.groesse == null || state.groesse <= 0)) {
      return null;
    }

    try {
      const calculated = calculatePrice({
        ...state,
        plz,
        zeitraum: state.zeitraum ?? state.dringlichkeit ?? "flexibel",
      });
      if (
        isBwZuKomplexErgebnis(state, calculated.resultModus) ||
        !portalPriceIsReliable(calculated)
      ) {
        return {
          ...calculated,
          min: 0,
          max: 0,
        };
      }
      return calculated;
    } catch {
      return null;
    }
  }, [
    cfg.showPrice,
    state,
    objekt?.plz,
    prefill?.plz,
    useMeldeKaputtFlow,
    groesseConfig,
    isHvIntern,
    hvAkut,
    meldeAkutFallIds,
  ]);

  const reliablePrice = portalPriceIsReliable(price);

  const patchFach = useCallback((patch: Partial<FachdetailsState>) => {
    setState((s) => ({
      ...s,
      fachdetails: { ...s.fachdetails, ...patch },
    }));
  }, []);

  const patchProjekt = useCallback(
    (patch: Partial<NonNullable<FachdetailsState["projekt"]>>) => {
      setState((s) => ({
        ...s,
        fachdetails: {
          ...s.fachdetails,
          projekt: { ...s.fachdetails?.projekt, ...patch },
        },
      }));
    },
    []
  );

  const buildStepOrder = useCallback((): StepId[] => {
    const out: StepId[] = [];
    if (
      cfg.prefix.objekt === "required" ||
      cfg.prefix.objekt === "optional"
    ) {
      out.push("objekt");
    }
    if (
      cfg.prefix.mieter === "required" ||
      cfg.prefix.mieter === "optional" ||
      cfg.prefix.mieter === "ohne_erlaubt"
    ) {
      out.push("mieter");
    }
    if (!cfg.forceKaputt) out.push("situation");
    out.push("bereiche");
    const meldeKaputt =
      isMeldeKaputtChannel(channel) && state.situation === "kaputt";
    /** Kaputt-Melde-Flow: Dringlichkeit entfällt (Auto-Akut je Bereich). */
    if (
      cfg.include.notfallDringlichkeit &&
      state.situation === "kaputt" &&
      !meldeKaputt
    ) {
      out.push("dringlichkeit");
    }
    if (meldeKaputt) {
      const b = state.bereiche[0];
      if (
        b &&
        getMeldeKaputtFachfragen(
          b,
          state.fachdetails?.fachdetailAnswers,
          meldeFrageVoice
        ).length > 0
      ) {
        out.push("fachdetail");
      }
    } else if (shouldUseWebsiteMidSteps(state.situation, false)) {
      const mid = mapResolvedStepsToPortalMid(resolvedWebsiteSteps, state, {
        skipDringlichkeit: out.includes("dringlichkeit"),
      });
      for (const id of mid) {
        if (id === "groesse" && !groesseConfig) continue;
        out.push(id);
      }
    }
    /** Umbau & Modernisierung: keine Fotos. */
    if (cfg.include.photos && state.situation !== "erneuern") {
      out.push("medien");
    }
    if (cfg.include.beschreibung) out.push("beschreibung");
    /** Privat / Melde / eingeloggter Mieter: Kontakt (+ Adresse) vor Ergebnis. */
    if (cfg.include.ortPlz && channel === "portal_privat") {
      out.push("kontakt");
    } else if (channel === "melde_anon" || channel === "portal_mieter") {
      out.push("kontakt");
    }
    out.push("result");
    return out;
  }, [cfg, state, channel, resolvedWebsiteSteps, groesseConfig, meldeFrageVoice]);

  const steps = buildStepOrder();

  /**
   * Kaputt + „hinter der Wand“: aktive Fachdetail-Fragen werden absichtlich geleert
   * (Diagnosepfad). Ohne Auto-Skip bleibt ein leerer Screen; Weiter machte
   * `indexOf("fachdetail") === -1` → Sprung zurück zu steps[0].
   */
  useEffect(() => {
    if (step !== "fachdetail") return;
    if (fachIds.length > 0 && currentFachId) return;
    const next = stepAfterFachdetail(buildStepOrder());
    if (next) setStep(next);
  }, [
    step,
    fachIds.length,
    currentFachId,
    buildStepOrder,
    stepAfterFachdetail,
  ]);

  /** Projekt-/Zustand-Steps können nach Antwort aus der Order fallen (z. B. Rohbau nein). */
  useEffect(() => {
    if (
      step === "objekt_neu" ||
      step === "mieter_neu" ||
      step === "fachdetail"
    ) {
      return;
    }
    const order = buildStepOrder();
    if (order.includes(step)) return;
    const fallback =
      order.find(
        (id) =>
          id === "medien" ||
          id === "beschreibung" ||
          id === "kontakt" ||
          id === "result"
      ) ?? order[order.length - 1];
    if (fallback) setStep(fallback);
  }, [step, buildStepOrder]);

  const summaryRows = useMemo((): SummaryRow[] => {
    const rows: SummaryRow[] = [];
    const push = (label: string, value: string | null | undefined) => {
      const v = (value ?? "").trim();
      if (v) rows.push({ label, value: v });
    };

    if (objekt) {
      const adr = [objekt.strasse, objekt.hausnummer, objekt.plz, objekt.ort]
        .filter(Boolean)
        .join(" ")
        .trim();
      push("Objekt", adr ? `${objekt.titel} · ${adr}` : objekt.titel);
    } else if (melde?.objektTitel?.trim()) {
      const adr = melde.objektAdresse?.trim();
      push(
        "Objekt",
        adr ? `${melde.objektTitel.trim()} · ${adr}` : melde.objektTitel.trim()
      );
    } else if (melde?.orgName) {
      push("Verwaltung", melde.orgName);
    }

    if (isHvIntern) {
      if (mieterMode === "ohne") {
        push("Mieter", "Ohne Mieter");
      } else if (mieterMode === "liste" && selectedMieterId) {
        const m = hvMieterListe.find((x) => x.id === selectedMieterId);
        push("Mieter", m?.name ?? "Aus Liste");
        if (m?.einheitLabel) push("Einheit", m.einheitLabel);
      } else if (mieterMode === "neu") {
        push("Mieter", mieterVollname || null);
        const adr = [
          mieterStrasse,
          mieterHausnummer,
          mieterPlz,
          mieterOrt,
        ]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        push("Mieter-Adresse", adr || null);
        push("E-Mail", mieterEmail.trim() || null);
        push("Telefon", mieterTel.trim() || null);
      }
    }

    if (einheit.trim()) push("Einheit", einheit.trim());

    if (state.situation && !cfg.forceKaputt) {
      const sit = BW_FUNNEL_STEP1_OPTIONS.find((o) => o.id === state.situation);
      push("Situation", sit?.label ?? state.situation);
    }

    if (state.situation && state.bereiche.length > 0) {
      const opts = bereicheOptions(state.situation, useMeldeKaputtFlow);
      push(
        "Bereich",
        state.bereiche.map((b) => optionLabel(opts, b)).join(", ")
      );
    }

    if (state.groesse != null && state.groesse > 0) {
      const einheitLabel =
        state.groesseEinheit === "stueck"
          ? "Stück"
          : state.groesseEinheit === "meter"
            ? "m"
            : "m²";
      push("Umfang", `${state.groesse} ${einheitLabel}`);
    }

    if (state.dringlichkeit) {
      push(
        "Dringlichkeit",
        optionLabel(
          dringlichkeitOptions({ stripSlaCopy: stripTerminInfos }),
          state.dringlichkeit
        )
      );
    }

    const pj = state.fachdetails?.projekt;
    if (pj?.ausbauRohbau) {
      push(
        "Rohbau",
        pj.ausbauRohbau === "ja" ? "Vorhanden" : "Muss erstellt werden"
      );
    }
    if (pj?.ausbauDeckenhoehe) {
      const labels: Record<string, string> = {
        niedrig: "Unter 2,00 m",
        mittel: "2,00–2,40 m",
        hoch: "Über 2,40 m",
      };
      push("Deckenhöhe", labels[pj.ausbauDeckenhoehe] ?? pj.ausbauDeckenhoehe);
    }
    if (pj?.gartenLeistung) {
      const gl = findResolvedStepDef(
        resolvedWebsiteSteps,
        "projekt_garten_leistung"
      );
      push(
        "Garten-Leistung",
        optionLabel((gl?.options ?? []) as StepOption[], pj.gartenLeistung)
      );
    }
    if (pj?.gartenTerrasseMaterial) {
      const labels: Record<string, string> = {
        holz_wpc: "Holz / WPC",
        naturstein: "Naturstein / Platten",
        noch_offen: "Noch offen",
      };
      push(
        "Terrassen-Material",
        labels[pj.gartenTerrasseMaterial] ?? pj.gartenTerrasseMaterial
      );
    }
    if (pj?.gartenZaun) {
      push("Zaunbau", pj.gartenZaun === "ja" ? "Ja" : "Nein");
    }
    if (pj?.gartenZugaenglichkeit) {
      push(
        "Garten-Zugang",
        pj.gartenZugaenglichkeit === "einfach" ? "Einfach" : "Schwer"
      );
    }
    if (pj?.durchbruchAnzahl != null) {
      push(
        "Durchbrüche",
        pj.durchbruchAnzahl >= 3 ? "Drei oder mehr" : String(pj.durchbruchAnzahl)
      );
    }
    if (pj?.durchbruchTragend !== undefined) {
      push(
        "Tragende Wände",
        pj.durchbruchTragend ? "Ja, tragend" : "Nein, nicht tragend"
      );
    }
    if (state.badAusstattung) {
      push(
        "Bad-Ausstattung",
        optionLabel(
          (BW_FUNNEL_STEP_BAD_AUSSTATTUNG.options ?? []) as StepOption[],
          state.badAusstattung
        )
      );
    }
    if (state.zugaenglichkeit) {
      push(
        "Zugänglichkeit",
        optionLabel(
          (BW_FUNNEL_STEP_ZUGAENGLICHKEIT.options ?? []) as StepOption[],
          state.zugaenglichkeit
        )
      );
    }
    if (state.zustand) {
      push(
        "Zustand",
        getZustandDisplayLabel(state.zustand, state.bereiche)
      );
    }

    if (useMeldeKaputtFlow) {
      for (const q of meldeFachfragen) {
        const raw = state.fachdetails?.fachdetailAnswers?.[q.id];
        const s = Array.isArray(raw) ? raw[0] : raw;
        if (!s) {
          push(q.frage, null);
          continue;
        }
        const opt = q.optionen.find((o) => o.value === s);
        push(q.frage, opt?.label ?? String(s));
      }
    } else {
      for (const q of getActiveFachdetailQuestions(state)) {
        const raw = state.fachdetails?.fachdetailAnswers?.[q.id];
        push(q.frage, fachAnswerLabel(q.optionen, raw));
      }
    }

    if (cfg.include.photos && state.situation !== "erneuern") {
      const n = state.photos.length;
      push("Fotos", n === 0 ? "Keine" : `${n} Datei${n === 1 ? "" : "en"}`);
    }

    push("Beschreibung", state.leadBeschreibung.trim() || null);

    const contactName =
      `${state.vorname.trim()} ${state.nachname.trim()}`.trim() ||
      state.name.trim();
    const showKontakt =
      steps.includes("kontakt") ||
      Boolean(contactName) ||
      Boolean(state.email.trim());
    if (showKontakt) {
      push("Name", contactName || null);
      push("E-Mail", state.email.trim() || null);
      push("Telefon", state.telefon.trim() || null);
      const adr = [
        state.strasse.trim(),
        state.hausnummer.trim(),
        [state.plz.trim(), state.ort.trim()].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ");
      push("Adresse", adr || null);
    }

    return rows;
  }, [
    objekt,
    melde?.orgName,
    melde?.objektTitel,
    melde?.objektAdresse,
    isHvIntern,
    mieterMode,
    selectedMieterId,
    hvMieterListe,
    mieterVollname,
    mieterStrasse,
    mieterHausnummer,
    mieterPlz,
    mieterOrt,
    mieterEmail,
    mieterTel,
    einheit,
    state,
    cfg.forceKaputt,
    cfg.include.photos,
    stripTerminInfos,
    steps,
    useMeldeKaputtFlow,
    meldeFachfragen,
    resolvedWebsiteSteps,
  ]);

  const goNext = () => {
    setError(null);
    const order = buildStepOrder();

    if (step === "fachdetail") {
      if (currentFachId) {
        const ans = state.fachdetails?.fachdetailAnswers?.[currentFachId];
        if (ans == null || ans === "") return;
      }
      // Fragen weg (z. B. Wand-Diagnose) oder letzte Frage beantwortet → weiter
      if (fachIds.length === 0 || fachIdx >= fachIds.length - 1) {
        const next = stepAfterFachdetail(order);
        if (next) setStep(next);
        return;
      }
      setFachIdx((i) => i + 1);
      return;
    }

    const key =
      step === "objekt_neu" ? "objekt" : step === "mieter_neu" ? "mieter" : step;
    const i = order.indexOf(key);
    // Orphan-Step (nicht mehr in Order) — nicht zu steps[0] springen
    if (i < 0) {
      const next = stepAfterFachdetail(order);
      if (next) setStep(next);
      return;
    }
    const next = order[i + 1];
    if (!next) return;
    if (next === "fachdetail") {
      setFachIdx(0);
      if (fachIds.length === 0) {
        const after = stepAfterFachdetail(order);
        if (after) setStep(after);
        return;
      }
    }
    setStep(next);
  };

  const goBack = () => {
    setError(null);
    if (step === "objekt_neu") {
      setStep("objekt");
      return;
    }
    if (step === "mieter_neu") {
      setStep("mieter");
      setMieterMode("ohne");
      return;
    }
    if (step === "fachdetail" && fachIdx > 0) {
      setFachIdx((i) => i - 1);
      return;
    }
    const order = buildStepOrder();
    let i = order.indexOf(step);
    if (i < 0) {
      // Orphan (z. B. fachdetail nach Wand-Shortcut): zurück zur Dringlichkeit/Bereiche
      if (order.includes("dringlichkeit")) {
        setStep("dringlichkeit");
        return;
      }
      if (order.includes("bereiche")) {
        setStep("bereiche");
        return;
      }
      i = 0;
    }
    if (i <= 0) {
      if (melde?.objektLocked) return;
      onClose();
      return;
    }
    const prev = order[i - 1]!;
    if (prev === "fachdetail") {
      const ids = useMeldeKaputtFlow
        ? fachIds
        : getActiveFachdetailQuestionIds(state);
      if (ids.length === 0) {
        const before = order[i - 2];
        if (before) setStep(before);
        return;
      }
      setFachIdx(Math.max(0, ids.length - 1));
      setStep("fachdetail");
      return;
    }
    setStep(prev);
  };

  const canNext = (): boolean => {
    if (step === "objekt") return !!objektId;
    if (step === "objekt_neu") {
      return (
        neuTitel.trim().length > 1 &&
        neuStrasse.trim().length > 1 &&
        neuHausnummer.trim().length > 0 &&
        neuPlz.trim().length >= 4 &&
        neuOrt.trim().length > 1
      );
    }
    if (step === "mieter_neu") {
      return (
        mieterVorname.trim().length > 0 && mieterNachname.trim().length > 0
      );
    }
    if (step === "mieter") {
      if (isHvIntern) {
        if (mieterMode === "ohne") return true;
        if (mieterMode === "liste") return Boolean(selectedMieterId);
        return mieterKontaktOk();
      }
      if (ohneMieter && cfg.prefix.mieter === "ohne_erlaubt") return true;
      if (ohneMieter && cfg.prefix.mieter === "optional") return true;
      return mieterKontaktOk();
    }
    if (step === "situation") return !!state.situation;
    if (step === "bereiche") return state.bereiche.length > 0;
    if (step === "dringlichkeit") return !!state.dringlichkeit;
    if (step === "fachdetail") {
      if (!currentFachId) return true;
      const ans = state.fachdetails?.fachdetailAnswers?.[currentFachId];
      return ans != null && String(ans).length > 0;
    }
    if (step === "groesse") {
      return state.groesse != null && state.groesse > 0;
    }
    if (step === "zugaenglichkeit") {
      return Boolean(state.zugaenglichkeit);
    }
    if (step === "zustand") {
      return Boolean(state.zustand);
    }
    if (step === "bad_ausstattung") {
      return Boolean(state.badAusstattung);
    }
    if (isPortalFunnelMidStepId(step) && step.startsWith("projekt_")) {
      return portalProjektStepAnswered(step, state.fachdetails?.projekt);
    }
    if (step === "medien") return true;
    if (step === "beschreibung") {
      if (state.situation === "erneuern") return true;
      return (state.leadBeschreibung || "").trim().length >= 10;
    }
    if (step === "kontakt") {
      const needsAddress =
        channel === "melde_anon" ||
        channel === "portal_mieter" ||
        (cfg.include.ortPlz && channel === "portal_privat") ||
        Boolean(melde?.needsAddress);
      if (needsAddress) {
        if (state.plz.trim().length < 4) return false;
        if (state.strasse.trim().length < 2) return false;
        if (state.ort.trim().length < 2) return false;
      }
      const fullName =
        `${state.vorname} ${state.nachname}`.trim() || state.name.trim();
      return (
        (channel === "melde_anon"
          ? state.vorname.trim().length > 0 && state.nachname.trim().length > 0
          : fullName.length > 1) &&
        state.email.trim().includes("@") &&
        (!cfg.include.datenschutzCheckbox || regelnOk)
      );
    }
    return true;
  };

  const createObjekt = async () => {
    setNeuBusy(true);
    setError(null);
    try {
      const endpoint =
        channel === "portal_eigentuemer"
          ? "/api/portal/eigentuemer/objekte"
          : "/api/org/objekte";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: neuTitel.trim(),
          strasse: neuStrasse.trim() || undefined,
          hausnummer: neuHausnummer.trim() || undefined,
          plz: neuPlz.trim(),
          ort: neuOrt.trim() || undefined,
          melde_aktiv: channel === "portal_hv",
          einheit: einheit.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        objekt?: PortalFunnelObjekt;
        id?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Objekt nicht angelegt.");
        return;
      }
      const created: PortalFunnelObjekt = json.objekt ?? {
        id: String(json.id),
        titel: neuTitel.trim(),
        strasse: neuStrasse.trim(),
        hausnummer: neuHausnummer.trim(),
        plz: neuPlz.trim(),
        ort: neuOrt.trim(),
      };
      const next = [...objekte, created];
      setObjekte(next);
      setObjektId(created.id);
      onObjekteChanged?.(next);
      setStep("mieter");
      portalToastSuccess("Objekt angelegt");
    } finally {
      setNeuBusy(false);
    }
  };

  const createMieter = async () => {
    const oid = objektId.trim();
    const name = [mieterVorname, mieterNachname]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    if (!oid || !name) {
      setError("Bitte Vor- und Nachname angeben.");
      return;
    }
    setNeuBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/einheit-bewohner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objektId: oid,
          name,
          wohnung: einheit.trim() || undefined,
          etage: einheit.trim() || undefined,
          email: mieterEmail.trim() || undefined,
          telefon: mieterTel.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? "Mieter nicht angelegt.");
        return;
      }
      const list = await loadHvMieterListe(oid);
      setHvMieterListe(list);
      const createdId = String(json.id);
      setSelectedMieterId(createdId);
      setMieterMode("liste");
      setOhneMieter(false);
      setMieterName(name);
      const created = list.find((m) => m.id === createdId);
      if (created?.einheitLabel) setEinheit(created.einheitLabel);
      setStep("mieter");
      portalToastSuccess("Mieter angelegt");
    } finally {
      setNeuBusy(false);
    }
  };

  const uploadFotos = async (): Promise<string[]> => {
    if (!melde || state.photos.length === 0) return [];
    const urls: string[] = [];
    for (const f of state.photos) {
      const fd = new FormData();
      fd.set("session_key", melde.sessionKey);
      fd.set("file", f);
      const res = await fetch("/api/meldung/upload", {
        method: "POST",
        body: fd,
      });
      if (res.status === 413) {
        const msg = "Datei zu groß (max. 8 MB)";
        portalToastError("Upload fehlgeschlagen", msg);
        throw new Error(msg);
      }
      let json: { url?: string; error?: string } = {};
      try {
        json = (await res.json()) as { url?: string; error?: string };
      } catch {
        if (!res.ok) {
          const msg = "Upload fehlgeschlagen";
          portalToastError("Upload fehlgeschlagen", msg);
          throw new Error(msg);
        }
      }
      if (!res.ok || !json.url) {
        const msg = json.error ?? "Upload fehlgeschlagen";
        portalToastError("Upload fehlgeschlagen", msg);
        throw new Error(msg);
      }
      urls.push(json.url);
    }
    return urls;
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let navigatedAway = false;
    try {
      if (channel === "melde_anon" && melde) {
        const bereich = state.bereiche[0] ?? "sonstiges";
        const bereichId = kaputtBereichToMeldeId(bereich);
        const fachAnswers = compactFachdetailAnswers(
          state.fachdetails?.fachdetailAnswers
        );
        const direktauftrag = isMeldeDirektauftrag(
          bereichId,
          fachAnswers,
          meldeAkutFallIds
        );
        const kategorie = meldeKategorieForDirektauftragFlow(
          bereichId,
          direktauftrag
        );
        const fotos = await uploadFotos();
        const isErgaenzen = !!melde.ergaenzenToken;
        const endpoint = isErgaenzen
          ? "/api/meldung/ergaenzen"
          : "/api/meldung";
        const contactName =
          `${state.vorname.trim()} ${state.nachname.trim()}`.trim() ||
          state.name.trim() ||
          mieterName.trim();
        const payload = isErgaenzen
          ? {
              token: melde.ergaenzenToken,
              name: contactName,
              email: state.email.trim() || mieterEmail.trim(),
              telefon: state.telefon.trim() || mieterTel.trim() || undefined,
              kategorie,
              bereichId,
              fachdetailAnswers: fachAnswers,
              direktauftrag,
              notfall: direktauftrag,
              beschreibung: state.leadBeschreibung.trim(),
              fotos,
            }
          : {
              org: melde.orgKennung,
              objekt: melde.objektSlug,
              name: contactName,
              email: state.email.trim() || mieterEmail.trim(),
              telefon: state.telefon.trim() || mieterTel.trim() || undefined,
              kategorie,
              bereichId,
              fachdetailAnswers: fachAnswers,
              direktauftrag,
              notfall: direktauftrag,
              beschreibung: state.leadBeschreibung.trim(),
              fotos,
              dringlichkeit: direktauftrag ? "sofort" : "diese_woche",
              ...(channel === "melde_anon" || melde.needsAddress
                ? {
                    plz: state.plz.trim(),
                    strasse: state.strasse.trim(),
                    hausnummer: state.hausnummer.trim() || undefined,
                    ort: state.ort.trim(),
                  }
                : {}),
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
          id?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Senden fehlgeschlagen.");
          return;
        }
        if (!isErgaenzen) {
          track.meldeAbgeschickt(
            direktauftrag ? "direktauftrag" : kategorie,
            melde.orgKennung
          );
        }
        const q = new URLSearchParams({
          org: melde.orgName,
          kennung: melde.orgKennung,
        });
        if (json.meldeTrackingToken) {
          q.set("token", json.meldeTrackingToken);
        } else if (json.statusLink) {
          q.set("statusLink", json.statusLink);
        }
        if (json.id?.trim()) {
          q.set("ref", json.id.trim().slice(0, 8).toUpperCase());
        }
        const contactEmail = state.email.trim() || mieterEmail.trim();
        const contactTel = state.telefon.trim() || mieterTel.trim();
        if (contactName) q.set("name", contactName);
        if (contactEmail) q.set("email", contactEmail);
        if (contactTel) q.set("telefon", contactTel);
        const confirmUrl = `/melden/bestaetigung?${q.toString()}`
        router.push(confirmUrl)
        // Harte Navigation falls SPA-Routing hängen bleibt (F-176).
        window.setTimeout(() => {
          if (window.location.pathname.includes("/melden/") && !window.location.pathname.includes("/bestaetigung")) {
            window.location.assign(confirmUrl)
          }
        }, 1200)
        onDone()
        navigatedAway = true;
        return;
      }

      if (channel === "portal_hv") {
        if (!objektId) {
          setError("Bitte ein Objekt wählen.");
          return;
        }
        if (!state.situation) {
          setError("Bitte ein Anliegen wählen.");
          return;
        }
        const contactName =
          mieterMode === "ohne"
            ? prefill?.name
            : mieterVollname || prefill?.name;
        const contactEmail =
          mieterMode === "ohne"
            ? prefill?.email
            : mieterEmail.trim() || prefill?.email;
        const contactTel =
          mieterMode === "ohne"
            ? undefined
            : mieterTel.trim() || prefill?.telefon || undefined;
        const mieterAdresse =
          mieterMode === "ohne"
            ? null
            : {
                vorname: mieterVorname.trim() || null,
                nachname: mieterNachname.trim() || null,
                name: mieterVollname || null,
                strasse: mieterStrasse.trim() || null,
                hausnummer: mieterHausnummer.trim() || null,
                plz: mieterPlz.trim() || null,
                ort: mieterOrt.trim() || null,
                email: mieterEmail.trim() || null,
                telefon: mieterTel.trim() || null,
                einheit: einheit.trim() || null,
              };
        const res = await fetch("/api/org/anfrage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anlass: state.situation === "kaputt" ? "meldung" : "projekt",
            objektId,
            situation: state.situation,
            bereiche: state.bereiche,
            preis_min: reliablePrice && price ? price.min : null,
            preis_max: reliablePrice && price ? price.max : null,
            zeitraum:
              state.situation === "kaputt" && useMeldeKaputtFlow
                ? hvAkut
                  ? "sofort"
                  : "diese_woche"
                : state.dringlichkeit || state.zeitraum || null,
            name: contactName,
            email: contactEmail,
            telefon: contactTel,
            melder_name:
              mieterMode === "ohne" ? undefined : mieterVollname || undefined,
            melder_email:
              mieterMode === "ohne"
                ? undefined
                : mieterEmail.trim() || undefined,
            melder_telefon:
              mieterMode === "ohne"
                ? undefined
                : mieterTel.trim() || undefined,
            melder_einheit:
              mieterMode === "ohne"
                ? undefined
                : einheit.trim() || undefined,
            beschreibung: [
              state.leadBeschreibung.trim(),
              mieterMode === "ohne"
                ? "Ohne Mieterbezug"
                : [
                    `Mieter: ${mieterVollname}`,
                    [
                      mieterStrasse.trim(),
                      mieterHausnummer.trim(),
                    ]
                      .filter(Boolean)
                      .join(" "),
                    [mieterPlz.trim(), mieterOrt.trim()]
                      .filter(Boolean)
                      .join(" "),
                    mieterEmail.trim(),
                    mieterTel.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
              einheit.trim() ? `Einheit: ${einheit.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            funnel_daten: {
              channel,
              fachdetails: state.fachdetails,
              ...(() => {
                if (
                  !(state.situation === "kaputt" && useMeldeKaputtFlow)
                ) {
                  return { dringlichkeit: state.dringlichkeit };
                }
                const bid = kaputtBereichToMeldeId(
                  state.bereiche[0] ?? "sonstiges"
                );
                const da = hvAkut;
                return {
                  dringlichkeit: da ? "sofort" : "diese_woche",
                  melde_kategorie: meldeKategorieForDirektauftragFlow(
                    bid,
                    da
                  ),
                  direktauftrag: da,
                  notfall: da,
                  akut_manuell: true,
                  akut_vorschlag: suggestedHvAkut,
                };
              })(),
              ohne_mieter: mieterMode === "ohne",
              mieter_neu: mieterMode === "neu",
              fotos_count: state.photos.length,
              ...(mieterAdresse ? { mieter: mieterAdresse } : {}),
              ...(objekt?.ort ? { ort: objekt.ort } : {}),
            },
          }),
        });
        let json: { error?: string } = {};
        try {
          json = (await res.json()) as { error?: string };
        } catch {
          json = { error: "Antwort vom Server ungültig." };
        }
        if (!res.ok) {
          const msg = json.error ?? "Absenden fehlgeschlagen.";
          setError(msg);
          portalToastError("Vorgang nicht erstellt", msg);
          return;
        }
        portalToastSuccess("Vorgang erstellt");
        onDone();
        return;
      }

      if (channel === "portal_eigentuemer") {
        if (!objektId) {
          setError("Bitte ein Objekt wählen.");
          return;
        }
        if (!state.situation) {
          setError("Bitte ein Anliegen wählen.");
          return;
        }
        const einheitTrim = einheit.trim();
        const matchedEinheit =
          objekt?.einheiten?.find(
            (e) =>
              e.id === einheitTrim ||
              e.label.trim().toLowerCase() === einheitTrim.toLowerCase()
          ) ?? null;
        const res = await fetch("/api/portal/eigentuemer/anfrage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objektId,
            einheitId: matchedEinheit?.id || undefined,
            einheitLabel: matchedEinheit?.label || einheitTrim || undefined,
            situation: state.situation,
            bereiche: state.bereiche,
            preis_min: reliablePrice && price ? price.min : null,
            preis_max: reliablePrice && price ? price.max : null,
            zeitraum: state.dringlichkeit || state.zeitraum || null,
            name:
              state.name.trim() ||
              mieterVollname ||
              prefill?.name ||
              undefined,
            email:
              state.email.trim() ||
              mieterEmail.trim() ||
              prefill?.email ||
              undefined,
            telefon:
              state.telefon.trim() ||
              mieterTel.trim() ||
              prefill?.telefon ||
              undefined,
            beschreibung: [
              state.leadBeschreibung.trim(),
              objekt ? `Objekt: ${objekt.titel}` : "",
              einheitTrim ? `Einheit: ${einheitTrim}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            funnel_daten: {
              channel,
              fachdetails: state.fachdetails,
              dringlichkeit: state.dringlichkeit,
              fotos_count: state.photos.length,
              ...(objekt?.ort ? { ort: objekt.ort } : {}),
            },
          }),
        });
        let json: { error?: string } = {};
        try {
          json = (await res.json()) as { error?: string };
        } catch {
          json = { error: "Antwort vom Server ungültig." };
        }
        if (!res.ok) {
          const msg = json.error ?? "Absenden fehlgeschlagen.";
          setError(msg);
          portalToastError("Anfrage nicht erstellt", msg);
          return;
        }
        portalToastSuccess("Anfrage gesendet");
        onDone();
        return;
      }

      /* privat / portal_mieter (registriert ohne melde) */
      const plz =
        state.plz.trim() ||
        objekt?.plz?.trim() ||
        prefill?.plz?.trim() ||
        "";
      const result = await submitBwLead(
        buildBwLeadPayload({
          name:
            state.name.trim() ||
            mieterName.trim() ||
            prefill?.name ||
            "Portal-Anfrage",
          email:
            state.email.trim() ||
            mieterEmail.trim() ||
            prefill?.email ||
            undefined,
          telefon:
            state.telefon.trim() ||
            mieterTel.trim() ||
            prefill?.telefon ||
            undefined,
          nachricht: [
            state.leadBeschreibung.trim(),
            objekt ? `Objekt: ${objekt.titel}` : "",
            einheit.trim() ? `Einheit: ${einheit.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          situation: state.situation,
          bereiche: state.bereiche,
          preis_min: reliablePrice && price ? price.min : undefined,
          preis_max: reliablePrice && price ? price.max : undefined,
          plz,
          strasse:
            state.strasse.trim() ||
            objekt?.strasse ||
            prefill?.strasse ||
            undefined,
          hausnummer:
            state.hausnummer.trim() ||
            objekt?.hausnummer ||
            prefill?.hausnummer ||
            undefined,
          ort: state.ort.trim() || prefill?.ort || objekt?.ort || undefined,
          zeitraum: state.zeitraum ?? state.dringlichkeit ?? "flexibel",
          kundentyp: state.kundentyp,
          funnel_daten: serializeFunnelStateForLead(state),
          funnel_quelle: channel,
          extra_funnel_daten: {
            channel,
            objekt_id: objektId || null,
          },
        })
      );
      if (!result.ok) {
        setError(result.error || "Absenden fehlgeschlagen.");
        return;
      }
      portalToastSuccess("Anfrage gesendet");
      onDone();
      navigatedAway = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Netzwerkfehler.";
      setError(msg);
      portalToastError("Senden fehlgeschlagen", msg);
    } finally {
      if (!navigatedAway) setBusy(false);
    }
  };

  const situations = BW_FUNNEL_STEP1_OPTIONS.filter((o) => {
    if (o.id === "gewerbe") return false;
    /** Mieter / QR-Melde: nur Reparatur & Notfall (kein Umbau / Betreuung). */
    if (
      (o.id === "betreuung" || o.id === "erneuern") &&
      (channel === "portal_mieter" || channel === "melde_anon")
    ) {
      return false;
    }
    /** HV: Betreuung nur über Servicepakete, nicht im Vorgangsmelder. */
    if (o.id === "betreuung" && channel === "portal_hv") {
      return false;
    }
    return true;
  }).map((o) => {
    if (!isHvIntern) return o;
    if (o.id === "kaputt") {
      return {
        ...o,
        hint: hvMitMieter
          ? "Defekt oder Notfall in der Wohnung"
          : "Defekt oder Notfall am Objekt",
      };
    }
    if (o.id === "erneuern" && hvMitMieter) {
      return {
        ...o,
        hint: "Umbau oder Modernisierung in der Wohnung",
      };
    }
    return o;
  });

  return (
    <div
      className={cn(
        "portal-funnel-host",
        layout === "modal" ? "portal-funnel-host--modal" : "portal-funnel-host--page"
      )}
    >
      {busy ? (
        <div className="portal-funnel-host__body flex flex-1 items-center justify-center px-4 py-12">
          <PortalAuthBusy
            title={
              channel === "melde_anon"
                ? "Meldung wird gesendet…"
                : "Anfrage wird gesendet…"
            }
            body="Einen Moment — Fotos und Angaben werden übermittelt."
          />
        </div>
      ) : (
        <>
      <div className="portal-funnel-host__body">

      {step === "objekt" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Objekt"
          question="Welches Objekt?"
          animateKey="objekt"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {objekte.map((o) => (
              <SelectionTile
                key={o.id}
                option={{
                  value: o.id,
                  label: o.titel,
                  hint: [o.strasse, o.plz, o.ort].filter(Boolean).join(", "),
                }}
                multi={false}
                selected={objektId === o.id}
                onChange={(v) => setObjektId(v)}
              />
            ))}
            {objekte.length === 0 && !cfg.prefix.objektNeu ? (
              <p className="text-sm text-text-secondary">
                Keine Objekte verfügbar.
              </p>
            ) : null}
            {objekte.length === 0 && cfg.prefix.objektNeu ? (
              <p className="text-sm text-text-secondary">
                Noch kein Objekt — legen Sie eines an.
              </p>
            ) : null}
          </div>
        </StepWrapper>
      ) : null}

      {step === "objekt_neu" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Objekt"
          question="Neues Objekt"
          animateKey="objekt_neu"
        >
          <div className="space-y-2">
            <input
              className="funnel-input w-full"
              placeholder="Bezeichnung / Titel"
              value={neuTitel}
              onChange={(e) => setNeuTitel(e.target.value)}
            />
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <input
                className="funnel-input w-full"
                placeholder="Straße"
                value={neuStrasse}
                onChange={(e) => setNeuStrasse(e.target.value)}
              />
              <input
                className="funnel-input w-full"
                placeholder="Nr."
                value={neuHausnummer}
                onChange={(e) => setNeuHausnummer(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <input
                className="funnel-input"
                placeholder="PLZ"
                value={neuPlz}
                onChange={(e) => setNeuPlz(e.target.value)}
              />
              <input
                className="funnel-input"
                placeholder="Ort"
                value={neuOrt}
                onChange={(e) => setNeuOrt(e.target.value)}
              />
            </div>
          </div>
        </StepWrapper>
      ) : null}

      {step === "mieter" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Mieter"
          question="Mieter zuordnen?"
          subtext={
            isHvIntern
              ? "Optional — ohne Mieter oder aus der Liste wählen"
              : cfg.prefix.einheit
                ? "Optional Einheit angeben"
                : "Optional — oder ohne Mieter"
          }
          animateKey="mieter"
        >
          {isHvIntern ? (
            <div className="funnel-step-tiles-card flex flex-col gap-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Auswahl
                </span>
              </div>
              <SelectionTile
                option={{
                  value: "ohne",
                  label: "Ohne Mieter",
                }}
                multi={false}
                selected={mieterMode === "ohne"}
                onChange={() => {
                  setMieterMode("ohne");
                  setOhneMieter(true);
                  setSelectedMieterId(null);
                }}
              />
              {hvMieterListe.map((m) => (
                <SelectionTile
                  key={m.id}
                  option={{
                    value: m.id,
                    label: [m.name, objekt?.titel].filter(Boolean).join(" · "),
                    hint: [m.einheitLabel, m.email, m.telefon]
                      .filter(Boolean)
                      .join(" · "),
                  }}
                  multi={false}
                  selected={mieterMode === "liste" && selectedMieterId === m.id}
                  onChange={() => {
                    setMieterMode("liste");
                    setOhneMieter(false);
                    setSelectedMieterId(m.id);
                    setMieterName(m.name);
                    setMieterVorname("");
                    setMieterNachname("");
                    setMieterEmail(m.email ?? "");
                    setMieterTel(m.telefon ?? "");
                    setMieterStrasse(objekt?.strasse?.trim() || "");
                    setMieterHausnummer(objekt?.hausnummer?.trim() || "");
                    setMieterPlz(objekt?.plz?.trim() || "");
                    setMieterOrt(objekt?.ort?.trim() || "");
                    if (m.einheitLabel) setEinheit(m.einheitLabel);
                  }}
                />
              ))}
              {hvMieterListe.length === 0 && cfg.prefix.mieterNeu ? (
                <p className="text-sm text-text-secondary">
                  Noch kein Mieter — legen Sie einen an.
                </p>
              ) : null}
            </div>
          ) : (
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {cfg.prefix.mieter === "ohne_erlaubt" ||
            cfg.prefix.mieter === "optional" ? (
              <SelectionTile
                option={{
                  value: "ohne",
                  label: "Ohne Mieter",
                }}
                multi={false}
                selected={ohneMieter}
                onChange={() => setOhneMieter(true)}
              />
            ) : null}
            <SelectionTile
              option={{
                value: "mit",
                label: cfg.prefix.mieterNeu
                  ? "Mieter angeben / neu"
                  : "Mieter angeben",
                hint: "Name und Kontakt",
              }}
              multi={false}
              selected={!ohneMieter}
              onChange={() => setOhneMieter(false)}
            />
            {!ohneMieter ? (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="funnel-input w-full"
                    placeholder="Vorname"
                    value={mieterVorname}
                    onChange={(e) => setMieterVorname(e.target.value)}
                    autoComplete="given-name"
                  />
                  <input
                    className="funnel-input w-full"
                    placeholder="Nachname"
                    value={mieterNachname}
                    onChange={(e) => setMieterNachname(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="grid grid-cols-[1fr_88px] gap-2">
                  <input
                    className="funnel-input"
                    placeholder="Straße"
                    value={mieterStrasse}
                    onChange={(e) => setMieterStrasse(e.target.value)}
                  />
                  <input
                    className="funnel-input"
                    placeholder="Nr."
                    value={mieterHausnummer}
                    onChange={(e) => setMieterHausnummer(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <input
                    className="funnel-input"
                    placeholder="PLZ"
                    value={mieterPlz}
                    onChange={(e) => setMieterPlz(e.target.value)}
                    inputMode="numeric"
                  />
                  <input
                    className="funnel-input"
                    placeholder="Ort"
                    value={mieterOrt}
                    onChange={(e) => setMieterOrt(e.target.value)}
                  />
                </div>
                <input
                  className="funnel-input w-full"
                  type="email"
                  placeholder="E-Mail"
                  value={mieterEmail}
                  onChange={(e) => setMieterEmail(e.target.value)}
                />
                <input
                  className="funnel-input w-full"
                  type="tel"
                  placeholder="Telefon (optional)"
                  value={mieterTel}
                  onChange={(e) => setMieterTel(e.target.value)}
                />
              </div>
            ) : null}
            {cfg.prefix.einheit ? (
              objekt?.einheiten && objekt.einheiten.length > 0 ? (
                <select
                  className="funnel-input mt-2 w-full"
                  value={einheit}
                  onChange={(e) => setEinheit(e.target.value)}
                >
                  <option value="">Einheit / Wohnung wählen</option>
                  {objekt.einheiten.map((eh) => (
                    <option key={eh.id} value={eh.label}>
                      {eh.label}
                      {eh.etage ? ` (Etage ${eh.etage})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="funnel-input mt-2 w-full"
                  placeholder="Einheit / Wohnung (optional)"
                  value={einheit}
                  onChange={(e) => setEinheit(e.target.value)}
                />
              )
            ) : null}
          </div>
          )}
        </StepWrapper>
      ) : null}

      {step === "mieter_neu" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Mieter"
          question="Neuer Mieter"
          subtext={
            objekt?.titel
              ? `Wird dem Objekt „${objekt.titel}“ zugeordnet`
              : undefined
          }
          animateKey="mieter_neu"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="funnel-input w-full"
                placeholder="Vorname"
                value={mieterVorname}
                onChange={(e) => setMieterVorname(e.target.value)}
                autoComplete="given-name"
              />
              <input
                className="funnel-input w-full"
                placeholder="Nachname"
                value={mieterNachname}
                onChange={(e) => setMieterNachname(e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <input
              className="funnel-input w-full"
              placeholder="z. B. 4. Stock li"
              value={einheit}
              onChange={(e) => setEinheit(e.target.value)}
              aria-label="Wohnung / Etage (optional)"
            />
            <input
              className="funnel-input w-full"
              type="email"
              placeholder="E-Mail (optional)"
              value={mieterEmail}
              onChange={(e) => setMieterEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="funnel-input w-full"
              type="tel"
              placeholder="Telefon (optional)"
              value={mieterTel}
              onChange={(e) => setMieterTel(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </StepWrapper>
      ) : null}

      {step === "situation" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Anliegen"
          question="Worum geht es?"
          animateKey="situation"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {situations.map((o) => (
              <SelectionTile
                key={o.id}
                option={{
                  value: o.id,
                  label: o.label,
                  hint: o.hint,
                  icon: o.icon,
                }}
                multi={false}
                selected={state.situation === o.id}
                onChange={(v) =>
                  setState((s) => ({
                    ...s,
                    situation: v as Situation,
                    bereiche: [],
                    fachdetails: {},
                    dringlichkeit: null,
                  }))
                }
              />
            ))}
          </div>
        </StepWrapper>
      ) : null}

      {step === "bereiche" && state.situation ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Bereich"
          question="Was ist betroffen?"
          subtext={
            useMeldeKaputtFlow
              ? hvMitMieter
                ? "Bitte das Passendste wählen"
                : isHvIntern
                  ? "Bereich für den Vorgang"
                  : undefined
              : undefined
          }
          infoTip={
            useMeldeKaputtFlow && !hvMitMieter && !isHvIntern
              ? "Wasser, Heizung, Strom & Co. — die Dringlichkeit setzen wir automatisch."
              : undefined
          }
          infoTipLabel="Zur Dringlichkeit"
          animateKey="bereiche"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {bereicheOptions(state.situation, useMeldeKaputtFlow).map((o) => {
              const opt = stripTerminInfos
                ? (() => {
                    const {
                      infoText: _i,
                      warnText: _w,
                      infoExpand: _e,
                      ...rest
                    } = o as StepOption & {
                      infoText?: string;
                      warnText?: string;
                      infoExpand?: string;
                    };
                    return rest;
                  })()
                : o;
              return (
              <SelectionTile
                key={opt.value}
                option={opt}
                multi={false}
                selected={state.bereiche.includes(opt.value)}
                onChange={(v) => {
                  setState((s) => ({
                    ...s,
                    bereiche: [v],
                    fachdetails: {},
                    ...(useMeldeKaputtFlow
                      ? {
                          dringlichkeit: "diese_woche",
                          zeitraum: "diese_woche",
                        }
                      : {}),
                  }));
                  setFachIdx(0);
                }}
              />
            );
            })}
          </div>
        </StepWrapper>
      ) : null}

      {step === "dringlichkeit" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Dringlichkeit"
          question="Wie dringend ist es?"
          animateKey="dringlichkeit"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {dringlichkeitOptions({
              stripSlaCopy: stripTerminInfos,
            }).map((o) => (
              <SelectionTile
                key={o.value}
                option={o}
                multi={false}
                selected={state.dringlichkeit === o.value}
                onChange={(v) =>
                  setState((s) => ({
                    ...s,
                    dringlichkeit: v as FunnelState["dringlichkeit"],
                    zeitraum: v as FunnelState["zeitraum"],
                  }))
                }
              />
            ))}
          </div>
        </StepWrapper>
      ) : null}

      {step === "fachdetail" && currentFachId && useMeldeKaputtFlow && currentMeldeFrage ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={`Detail ${fachIdx + 1}/${Math.max(1, fachIds.length)}`}
          question={currentMeldeFrage.frage}
          animateKey={currentFachId}
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {currentMeldeFrage.optionen.map((o) => (
              <SelectionTile
                key={o.value}
                option={{
                  value: o.value,
                  label: o.label,
                  hint: o.hint,
                  icon: o.icon,
                }}
                multi={false}
                selected={
                  String(
                    state.fachdetails?.fachdetailAnswers?.[currentFachId] ?? ""
                  ) === o.value
                }
                onChange={(v) => {
                  const prev = state.fachdetails?.fachdetailAnswers ?? {};
                  const nextAnswers =
                    currentFachId === "melde_problem"
                      ? { melde_problem: v }
                      : { ...prev, [currentFachId]: v };
                  patchFach({ fachdetailAnswers: nextAnswers });
                  if (currentFachId === "melde_problem") setFachIdx(0);
                }}
              />
            ))}
          </div>
        </StepWrapper>
      ) : null}

      {step === "fachdetail" && currentFachId && !useMeldeKaputtFlow ? (
        <FachdetailsStep
          questionId={currentFachId}
          state={state}
          onPatch={patchFach}
          showOmitHint={false}
          detailIndex={fachIdx}
          detailTotal={Math.max(1, fachIds.length)}
          animateKey={currentFachId}
          stripInfoBoxes={stripTerminInfos}
          layout={stepLayout}
        />
      ) : null}

      {step === "groesse" && groesseConfig ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Umfang"
          question={groesseStepCopy?.question ?? "Wie groß ist die Fläche ungefähr?"}
          subtext={groesseStepCopy?.subtext ?? groesseConfig.einheit}
          animateKey="groesse"
        >
          <GroesseStep
            config={groesseConfig}
            groesse={state.groesse}
            onGroesseChange={(value) =>
              setState((s) => ({
                ...s,
                groesse: value,
                groesseEinheit: groesseEinheitFromConfig(groesseConfig),
              }))
            }
          />
        </StepWrapper>
      ) : null}

      {step === "zugaenglichkeit" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={portalMidStepLabel("zugaenglichkeit")}
          question={BW_FUNNEL_STEP_ZUGAENGLICHKEIT.question}
          subtext={BW_FUNNEL_STEP_ZUGAENGLICHKEIT.subtext}
          animateKey="zugaenglichkeit"
          tilesCard
        >
          <div className="space-y-3">
            {(BW_FUNNEL_STEP_ZUGAENGLICHKEIT.options ?? []).map((opt) => {
              const libOpt = asLibOpt(opt);
              const selected = state.zugaenglichkeit === opt.value;
              return (
                <SelectionTile
                  key={opt.value}
                  option={libOpt}
                  selected={selected}
                  multi={false}
                  onChange={(value, sel) => {
                    setState((s) => ({
                      ...s,
                      zugaenglichkeit: sel
                        ? (value as Zugaenglichkeit)
                        : null,
                    }));
                  }}
                />
              );
            })}
            <p className="mt-1 text-center text-[12px] leading-snug text-text-tertiary">
              {BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND}
            </p>
          </div>
        </StepWrapper>
      ) : null}

      {step === "zustand" && zustandStepDef ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={portalMidStepLabel("zustand")}
          question={zustandStepDef.question}
          subtext={zustandStepDef.subtext}
          animateKey="zustand"
          tilesCard
        >
          <div className="space-y-3">
            {(zustandStepDef.options ?? []).map((opt) => {
              const libOpt = asLibOpt(opt);
              const selected = state.zustand === opt.value;
              return (
                <SelectionTile
                  key={opt.value}
                  option={libOpt}
                  selected={selected}
                  multi={false}
                  onChange={(value, sel) => {
                    setState((s) => ({
                      ...s,
                      zustand: sel ? (value as ObjektZustand) : null,
                    }));
                  }}
                />
              );
            })}
            <p className="mt-1 text-center text-[12px] leading-snug text-text-tertiary">
              {BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND}
            </p>
          </div>
        </StepWrapper>
      ) : null}

      {step === "bad_ausstattung" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={portalMidStepLabel("bad_ausstattung")}
          question={BW_FUNNEL_STEP_BAD_AUSSTATTUNG.question}
          subtext={BW_FUNNEL_STEP_BAD_AUSSTATTUNG.subtext}
          animateKey="bad_ausstattung"
          tilesCard
        >
          <div className="space-y-3">
            {(BW_FUNNEL_STEP_BAD_AUSSTATTUNG.options ?? []).map((opt) => {
              const libOpt = asLibOpt(opt);
              const selected = (state.badAusstattung ?? null) === opt.value;
              return (
                <SelectionTile
                  key={opt.value}
                  option={libOpt}
                  selected={selected}
                  multi={false}
                  onChange={(value, sel) => {
                    setState((s) => ({
                      ...s,
                      badAusstattung: sel
                        ? (value as "standard" | "komfort" | "gehoben")
                        : null,
                    }));
                  }}
                />
              );
            })}
          </div>
        </StepWrapper>
      ) : null}

      {isPortalFunnelMidStepId(step) &&
      step.startsWith("projekt_") &&
      findResolvedStepDef(resolvedWebsiteSteps, step)?.options?.length ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={portalMidStepLabel(step)}
          question={
            findResolvedStepDef(resolvedWebsiteSteps, step)!.question
          }
          subtext={findResolvedStepDef(resolvedWebsiteSteps, step)!.subtext}
          animateKey={step}
          tilesCard
        >
          <div className="space-y-3">
            {findResolvedStepDef(resolvedWebsiteSteps, step)!.options!.map(
              (opt) => {
                const def = findResolvedStepDef(resolvedWebsiteSteps, step)!;
                const libOpt = asLibOpt(opt);
                const pj = state.fachdetails?.projekt;
                let selected = false;
                if (step === "projekt_terrasse_material") {
                  selected = pj?.terrasseMaterial === opt.value;
                } else if (step === "projekt_terrasse_unterbau") {
                  selected = pj?.terrasseUnterbau === opt.value;
                } else if (step === "projekt_garten_leistung") {
                  selected = pj?.gartenLeistung === opt.value;
                } else if (step === "projekt_garten_terrasse_material") {
                  selected = pj?.gartenTerrasseMaterial === opt.value;
                } else if (step === "projekt_garten_zaun") {
                  selected = pj?.gartenZaun === opt.value;
                } else if (step === "projekt_garten_zugang") {
                  selected = pj?.gartenZugaenglichkeit === opt.value;
                } else if (step === "projekt_ausbau_rohbau") {
                  selected = pj?.ausbauRohbau === opt.value;
                } else if (step === "projekt_ausbau_deckenhoehe") {
                  selected = pj?.ausbauDeckenhoehe === opt.value;
                } else if (step === "projekt_durchbruch_anzahl") {
                  const n = pj?.durchbruchAnzahl;
                  if (opt.value === "1") selected = n === 1;
                  else if (opt.value === "2") selected = n === 2;
                  else if (opt.value === "3_plus") selected = n === 3;
                } else if (step === "projekt_durchbruch_statik") {
                  selected =
                    opt.value === "tragend"
                      ? pj?.durchbruchTragend === true
                      : pj?.durchbruchTragend === false;
                }
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      if (step === "projekt_terrasse_material") {
                        patchProjekt({
                          terrasseMaterial: sel
                            ? (value as "holz" | "stein")
                            : undefined,
                        });
                      } else if (step === "projekt_terrasse_unterbau") {
                        patchProjekt({
                          terrasseUnterbau: sel
                            ? (value as "ja" | "nein")
                            : undefined,
                        });
                      } else if (step === "projekt_garten_leistung") {
                        const nextLeistung = sel
                          ? (value as NonNullable<
                              FachdetailsState["projekt"]
                            >["gartenLeistung"])
                          : undefined;
                        patchProjekt({
                          gartenLeistung: nextLeistung,
                          gartenTerrasseMaterial:
                            nextLeistung === "terrasse"
                              ? state.fachdetails?.projekt
                                  ?.gartenTerrasseMaterial
                              : undefined,
                          gartenZaun:
                            nextLeistung === "rollrasen" ||
                            nextLeistung === "auffrischung"
                              ? undefined
                              : state.fachdetails?.projekt?.gartenZaun,
                        });
                      } else if (step === "projekt_garten_terrasse_material") {
                        patchProjekt({
                          gartenTerrasseMaterial: sel
                            ? (value as
                                | "holz_wpc"
                                | "naturstein"
                                | "noch_offen")
                            : undefined,
                        });
                      } else if (step === "projekt_garten_zaun") {
                        patchProjekt({
                          gartenZaun: sel
                            ? (value as "ja" | "nein")
                            : undefined,
                        });
                      } else if (step === "projekt_garten_zugang") {
                        patchProjekt({
                          gartenZugaenglichkeit: sel
                            ? (value as "einfach" | "schwer")
                            : undefined,
                        });
                      } else if (step === "projekt_ausbau_rohbau") {
                        patchProjekt({
                          ausbauRohbau: sel
                            ? (value as "ja" | "nein")
                            : undefined,
                          ausbauDeckenhoehe: undefined,
                        });
                      } else if (step === "projekt_ausbau_deckenhoehe") {
                        patchProjekt({
                          ausbauDeckenhoehe: sel
                            ? (value as "niedrig" | "mittel" | "hoch")
                            : undefined,
                        });
                      } else if (step === "projekt_durchbruch_anzahl") {
                        const raw = def.options?.find((o) => o.value === value);
                        const g =
                          typeof raw?.groesse === "number" ? raw.groesse : 1;
                        patchProjekt({
                          durchbruchAnzahl: sel ? g : undefined,
                        });
                      } else if (step === "projekt_durchbruch_statik") {
                        patchProjekt({
                          durchbruchTragend: sel
                            ? value === "tragend"
                            : undefined,
                        });
                      }
                    }}
                  />
                );
              }
            )}
          </div>
        </StepWrapper>
      ) : null}

      {step === "medien" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Fotos"
          question={hvMitMieter ? "Fotos vom Schaden" : "Fotos hinzufügen"}
          subtext={
            hvMitMieter
              ? "Optional — kurze Aufnahmen helfen bei der Einschätzung"
              : "Optional — hilft bei der Einschätzung"
          }
          animateKey="medien"
        >
          <PhotoUpload
            files={state.photos}
            onChange={(files) => setState((s) => ({ ...s, photos: files }))}
            buttonTitle={
              channel === "melde_anon" ||
              channel === "portal_mieter" ||
              hvMitMieter
                ? "Fotos hochladen"
                : isHvIntern
                  ? "Fotos hochladen"
                  : "Fotos oder Vergleichsangebote hochladen"
            }
            buttonHint={
              channel === "melde_anon" ||
              channel === "portal_mieter" ||
              hvMitMieter
                ? "Fotos vom Schaden — optional"
                : isHvIntern
                  ? "Fotos vom Schaden oder Objekt — optional"
                  : undefined
            }
            showCompareOfferHint={false}
            examples={
              useMeldeKaputtFlow
                ? getMeldeFotoBeispiele(
                    state.bereiche[0] ?? "sonstiges",
                    state.fachdetails?.fachdetailAnswers
                  )
                : null
            }
          />
        </StepWrapper>
      ) : null}

      {step === "beschreibung" ? (
        <StepWrapper
          layout={stepLayout}
          className={cn(
            "funnel-step--fill",
            stepLayout === "page" && "w-full"
          )}
          stepLabel="Beschreibung"
          question={
            state.situation === "erneuern"
              ? "Beschreibung"
              : hvMitMieter
                ? "Was ist passiert?"
                : isHvIntern
                  ? "Was liegt vor?"
                  : "Was ist passiert?"
          }
          subtext={
            state.situation === "erneuern"
              ? hvMitMieter
                ? "Optional — noch etwas ergänzen?"
                : "Möchten Sie uns noch etwas mitteilen?"
              : "Mindestens 10 Zeichen"
          }
          animateKey="beschreibung"
        >
          <PortalKiAssistField
            scope="funnel_beschreibung"
            className="funnel-ki-fill"
            label="Beschreibung"
            value={state.leadBeschreibung}
            onApply={(text) =>
              setState((s) => ({ ...s, leadBeschreibung: text }))
            }
            contextHint={[
              state.situation ? `Situation: ${state.situation}` : null,
              state.bereiche?.length
                ? `Bereich: ${state.bereiche.join(", ")}`
                : null,
              hvMitMieter
                ? "Stimme: Mieter-Meldung — so formulieren, als würde der Mieter den Schaden selbst schildern (Ich/Sie in der Wohnung), nicht als Hausverwaltung."
                : isHvIntern
                  ? "Stimme: interne HV-Meldung ohne Mieter — sachlich, Objektbezug."
                  : null,
            ]
              .filter(Boolean)
              .join("\n")}
          >
            <div className="funnel-textarea-fill-wrap">
              <textarea
                className="funnel-input w-full"
                value={state.leadBeschreibung}
                onChange={(e) =>
                  setState((s) => ({ ...s, leadBeschreibung: e.target.value }))
                }
                placeholder={
                  state.situation === "erneuern"
                    ? "Optional — z. B. Wunschtermin, Besonderheiten …"
                    : hvMitMieter
                      ? "z. B. tropfender Hahn im Bad, seit gestern"
                      : isHvIntern
                        ? "Beschreiben Sie den Schaden am Objekt …"
                        : "Beschreiben Sie den Schaden oder das Anliegen …"
                }
              />
            </div>
          </PortalKiAssistField>
        </StepWrapper>
      ) : null}

      {step === "kontakt" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel={
            channel === "melde_anon" ||
            channel === "portal_mieter" ||
            melde?.needsAddress ||
            cfg.include.ortPlz
              ? "Ort & Kontakt"
              : "Kontakt"
          }
          question={
            channel === "melde_anon" ||
            channel === "portal_mieter" ||
            melde?.needsAddress ||
            cfg.include.ortPlz
              ? "Ihre Adresse und Kontaktdaten"
              : "Ihre Kontaktdaten"
          }
          animateKey="kontakt"
        >
          <div className="space-y-2">
            {channel === "melde_anon" ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="funnel-input w-full"
                  placeholder="Vorname"
                  value={state.vorname}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      vorname: e.target.value,
                      name: `${e.target.value} ${s.nachname}`.trim(),
                    }))
                  }
                  autoComplete="given-name"
                />
                <input
                  className="funnel-input w-full"
                  placeholder="Nachname"
                  value={state.nachname}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      nachname: e.target.value,
                      name: `${s.vorname} ${e.target.value}`.trim(),
                    }))
                  }
                  autoComplete="family-name"
                />
              </div>
            ) : (
              <input
                className="funnel-input w-full"
                placeholder="Name"
                value={state.name}
                onChange={(e) =>
                  setState((s) => ({ ...s, name: e.target.value }))
                }
              />
            )}
            {(channel === "melde_anon" ||
              channel === "portal_mieter" ||
              melde?.needsAddress ||
              (cfg.include.ortPlz && channel === "portal_privat")) && (
              <>
                <div className="grid grid-cols-[1fr_88px] gap-2">
                  <input
                    className="funnel-input"
                    placeholder="Straße"
                    value={state.strasse}
                    onChange={(e) =>
                      setState((s) => ({ ...s, strasse: e.target.value }))
                    }
                    autoComplete="street-address"
                  />
                  <input
                    className="funnel-input"
                    placeholder="Nr."
                    value={state.hausnummer}
                    onChange={(e) =>
                      setState((s) => ({ ...s, hausnummer: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <input
                    className="funnel-input"
                    placeholder="PLZ"
                    value={state.plz}
                    onChange={(e) =>
                      setState((s) => ({ ...s, plz: e.target.value }))
                    }
                    autoComplete="postal-code"
                  />
                  <input
                    className="funnel-input"
                    placeholder="Ort"
                    value={state.ort}
                    onChange={(e) =>
                      setState((s) => ({ ...s, ort: e.target.value }))
                    }
                    autoComplete="address-level2"
                  />
                </div>
              </>
            )}
            <input
              className="funnel-input w-full"
              type="email"
              placeholder="E-Mail"
              value={state.email}
              onChange={(e) =>
                setState((s) => ({ ...s, email: e.target.value }))
              }
              autoComplete="email"
            />
            <input
              className="funnel-input w-full"
              type="tel"
              placeholder="Telefon (optional)"
              value={state.telefon}
              onChange={(e) =>
                setState((s) => ({ ...s, telefon: e.target.value }))
              }
              autoComplete="tel"
            />
            {cfg.include.datenschutzCheckbox ? (
              <label className="flex items-start gap-2 text-[13px] text-text-secondary">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={regelnOk}
                  onChange={(e) => setRegelnOk(e.target.checked)}
                />
                <span>
                  Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung
                  der Anfrage zu.
                </span>
              </label>
            ) : null}
            {melde?.orgName &&
            (channel === "melde_anon" || channel === "portal_mieter") ? (
              <MeldeDatenschutzHinweis
                orgName={melde.orgName}
                mode={melde.ergaenzenToken ? "ergaenzen" : "melden"}
                datenschutzHref={melde.datenschutzHref}
                impressumHref={melde.impressumHref}
              />
            ) : null}
          </div>
        </StepWrapper>
      ) : null}

      {step === "result" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Abschluss"
          question={cfg.showPrice ? "Preisrahmen" : "Prüfen & absenden"}
          subtext={
            cfg.showPrice
              ? isHvIntern
                ? "Indikation zur Orientierung — verbindlich nach Prüfung"
                : "Indikation — verbindlich nach Prüfung"
              : "Alle Angaben prüfen und absenden"
          }
          animateKey="result"
        >
          <div className="space-y-3">
            {cfg.showPrice ? (
              <div className="funnel-card-float p-4">
                {reliablePrice && price ? (
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
                    {formatCurrencyEUR(price.min)} –{" "}
                    {formatCurrencyEUR(price.max)}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                      Individuelle Beratung
                    </p>
                    <p className="text-sm text-text-secondary">
                      Für dieses Vorhaben gibt es keinen Sofort-Preisrahmen —
                      Bärenwald meldet sich mit einer Einschätzung nach Prüfung.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="funnel-card-float overflow-hidden">
              <p className="border-b border-border-light px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-text-tertiary">
                {hvMitMieter ? "Angaben zur Meldung" : "Ihre Angaben"}
              </p>
              <dl className="divide-y divide-border-light px-4">
                {summaryRows.map((row) => (
                  <div
                    key={`${row.label}-${row.value.slice(0, 24)}`}
                    className="flex justify-between gap-3 py-2.5 text-[13px]"
                  >
                    <dt className="shrink-0 text-text-secondary">{row.label}</dt>
                    <dd className="max-w-[62%] whitespace-pre-wrap text-right font-semibold text-text-primary">
                      {row.value}
                    </dd>
                  </div>
                ))}
                {summaryRows.length === 0 ? (
                  <p className="py-3 text-sm text-text-secondary">
                    Keine Angaben vorhanden.
                  </p>
                ) : null}
              </dl>
            </div>

            {isHvIntern && useMeldeKaputtFlow ? (
              <label className="funnel-card-float flex cursor-pointer items-start gap-3 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--p2-primary,#1a6b4a)]"
                  checked={hvAkut}
                  onChange={(e) => setHvAkut(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-text-primary">
                    Akut / Sofortmaßnahme
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                    {suggestedHvAkut
                      ? "Vorschlag aus den Angaben — Häkchen setzen oder entfernen."
                      : "Optional setzen, wenn sofort gehandelt werden soll."}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </StepWrapper>
      ) : null}

      {error && step !== "result" ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      </div>

      {step === "objekt" && cfg.prefix.objektNeu ? (
        <button
          type="button"
          className="portal-funnel-objekt-fab"
          aria-label="Neues Objekt anlegen"
          title="Neues Objekt anlegen"
          onClick={() => setStep("objekt_neu")}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}

      {step === "mieter" && isHvIntern && cfg.prefix.mieterNeu ? (
        <button
          type="button"
          className="portal-funnel-objekt-fab"
          aria-label="Neuen Mieter anlegen"
          title="Neuen Mieter anlegen"
          onClick={() => {
            resetMieterNeuForm(objekt);
            setMieterMode("neu");
            setOhneMieter(false);
            setSelectedMieterId(null);
            setStep("mieter_neu");
          }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}

      <FunnelFooter
        className={
          layout === "modal" ? "portal-funnel-host__footer" : undefined
        }
        impressumHref={melde?.impressumHref}
        datenschutzHref={melde?.datenschutzHref}
        onBack={
          steps.indexOf(step) <= 0 && melde?.objektLocked
            ? undefined
            : goBack
        }
        onNext={
          step === "objekt_neu"
            ? () => void createObjekt()
            : step === "mieter_neu"
              ? () => void createMieter()
              : step === "result"
                ? () => void submit()
                : goNext
        }
        nextDisabled={
          step === "objekt_neu" || step === "mieter_neu"
            ? !canNext() || neuBusy
            : step === "result"
              ? busy
              : !canNext()
        }
        nextLabel={
          step === "objekt_neu"
            ? neuBusy
              ? "Speichern…"
              : "Objekt speichern →"
            : step === "mieter_neu"
              ? neuBusy
                ? "Speichern…"
                : "Mieter speichern →"
              : step === "result"
                ? "Absenden →"
                : "Weiter →"
        }
      />
        </>
      )}
    </div>
  );
}
