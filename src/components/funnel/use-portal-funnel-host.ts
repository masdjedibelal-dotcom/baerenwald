"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildBwLeadPayload,
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import { portalPriceIsReliable } from "@/components/funnel/portal-funnel-options";
import {
  buildStepOrder,
  stepAfterFachdetail,
} from "@/components/funnel/portal-funnel-step-order";
import { buildPortalFunnelSummaryRows } from "@/components/funnel/portal-funnel-summary";
import type {
  HvMieterOption,
  PortalFunnelHostProps,
  PortalFunnelObjekt,
  PortalFunnelStepId,
  SummaryRow,
} from "@/components/funnel/portal-funnel-types";
import {
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
  buildZustandStepForBereiche,
  SITUATIONEN_CONFIG,
} from "@/lib/funnel/config";
import {
  getActiveFachdetailQuestionIds,
} from "@/lib/funnel/fachdetail-questions-flat";
import {
  funnelVariant,
} from "@/lib/funnel/funnel-variant";
import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import {
  getMeldeKaputtFachfragen,
  isMeldeKaputtChannel,
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
} from "@/lib/funnel/groesse-config";
import { skipGroesseForSanierenDachKleinjob } from "@/lib/funnel/dach-step-order";
import {
  findResolvedGroesseStep,
  getPortalResolvedFunnelSteps,
  isPortalFunnelMidStepId,
  portalProjektStepAnswered,
  shouldUseWebsiteMidSteps,
} from "@/lib/funnel/portal-funnel-mid-steps";
import { mapMeldeToPrice, compactFachdetailAnswers } from "@/lib/org/map-melde-to-price";
import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import type {
  FachdetailsState,
  FunnelState,
  Situation,
} from "@/lib/funnel/types";
import { BW_FUNNEL_INITIAL_STATE } from "@/hooks/funnel/useFunnelState";
import { track } from "@/lib/analytics";
import { useFormZwischenstand } from "@/lib/portal2/form-zwischenstand";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { TOAST } from '@/lib/portal-copy'

type MeldeFunnelDraft = {
  step: PortalFunnelStepId;
  fachIdx: number;
  state: FunnelState;
  objektId: string;
  einheit: string;
  mieterMode: "ohne" | "liste" | "neu";
  ohneMieter: boolean;
  selectedMieterId: string | null;
  mieterVorname: string;
  mieterNachname: string;
  mieterName: string;
  mieterEmail: string;
  mieterTel: string;
  mieterStrasse: string;
  mieterHausnummer: string;
  mieterPlz: string;
  mieterOrt: string;
  regelnOk: boolean;
  hvAkut?: boolean;
};

export type PortalFunnelHostModel = ReturnType<typeof usePortalFunnelHost>;

/**
 * State + Navigation + Submit für {@link PortalFunnelHost}.
 */
export function usePortalFunnelHost({
  channel,
  objekte: objekteProp = [],
  prefill,
  melde,
  onClose,
  onDone,
  onObjekteChanged,
  layout = "modal",
}: PortalFunnelHostProps) {
  const router = useRouter();
  const cfg = funnelVariant(channel);
  const [objekte, setObjekte] = useState(objekteProp);
  const stepLayout: "page" | "modal" =
    layout === "page" ? "page" : "modal";
  const meldeAkutFallIds = melde?.akutFallIds ?? [];

  const initialSituation: Situation | null = cfg.forceKaputt
    ? "kaputt"
    : null;

  const [step, setStep] = useState<PortalFunnelStepId>(() => {
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

  // stepAfterFachdetail: imported from portal-funnel-step-order

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

  const steps = useMemo(
    () =>
      buildStepOrder({
        cfg,
        state,
        channel,
        resolvedWebsiteSteps,
        groesseConfig,
        meldeFrageVoice,
      }),
    [cfg, state, channel, resolvedWebsiteSteps, groesseConfig, meldeFrageVoice]
  );

  const buildStepOrderCb = useCallback(
    () =>
      buildStepOrder({
        cfg,
        state,
        channel,
        resolvedWebsiteSteps,
        groesseConfig,
        meldeFrageVoice,
      }),
    [cfg, state, channel, resolvedWebsiteSteps, groesseConfig, meldeFrageVoice]
  );

  /**
   * Kaputt + „hinter der Wand“: aktive Fachdetail-Fragen werden absichtlich geleert
   * (Diagnosepfad). Ohne Auto-Skip bleibt ein leerer Screen; Weiter machte
   * `indexOf("fachdetail") === -1` → Sprung zurück zu steps[0].
   */
  useEffect(() => {
    if (step !== "fachdetail") return;
    if (fachIds.length > 0 && currentFachId) return;
    const next = stepAfterFachdetail(buildStepOrderCb());
    if (next) setStep(next);
  }, [
    step,
    fachIds.length,
    currentFachId,
    buildStepOrderCb,
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
    const order = buildStepOrderCb();
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
  }, [step, buildStepOrderCb]);

  const summaryRows = useMemo(
    () =>
      buildPortalFunnelSummaryRows({
        objekt,
        melde,
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
        forceKaputt: cfg.forceKaputt,
        includePhotos: cfg.include.photos,
        stripTerminInfos,
        steps,
        useMeldeKaputtFlow,
        meldeFachfragen,
        resolvedWebsiteSteps,
      }),
    [
      objekt,
      melde,
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
    ]
  );

  const goNext = () => {
    setError(null);
    const order = buildStepOrderCb();

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
    const order = buildStepOrderCb();
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
      portalToastSuccess(TOAST.objekt_angelegt);
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
      portalToastSuccess(TOAST.mieter_angelegt);
    } finally {
      setNeuBusy(false);
    }
  };

  const meldeZwischenstandKey = melde
    ? `bw:melde-draft:${melde.orgKennung}:${melde.objektSlug}:${melde.ergaenzenToken ?? "neu"}`
    : "";

  const meldeDraftData = useMemo<MeldeFunnelDraft>(
    () => ({
      step,
      fachIdx,
      state,
      objektId,
      einheit,
      mieterMode,
      ohneMieter,
      selectedMieterId,
      mieterVorname,
      mieterNachname,
      mieterName,
      mieterEmail,
      mieterTel,
      mieterStrasse,
      mieterHausnummer,
      mieterPlz,
      mieterOrt,
      regelnOk,
      hvAkut,
    }),
    [
      step,
      fachIdx,
      state,
      objektId,
      einheit,
      mieterMode,
      ohneMieter,
      selectedMieterId,
      mieterVorname,
      mieterNachname,
      mieterName,
      mieterEmail,
      mieterTel,
      mieterStrasse,
      mieterHausnummer,
      mieterPlz,
      mieterOrt,
      regelnOk,
      hvAkut,
    ]
  );

  const onRestoreMeldeDraft = useCallback((data: MeldeFunnelDraft) => {
    setStep(data.step);
    setFachIdx(
      typeof data.fachIdx === "number" && data.fachIdx >= 0 ? data.fachIdx : 0
    );
    setState({
      ...data.state,
      photos: [],
    });
    if (typeof data.objektId === "string") setObjektId(data.objektId);
    if (typeof data.einheit === "string") setEinheit(data.einheit);
    if (
      data.mieterMode === "ohne" ||
      data.mieterMode === "liste" ||
      data.mieterMode === "neu"
    ) {
      setMieterMode(data.mieterMode);
    }
    if (typeof data.ohneMieter === "boolean") setOhneMieter(data.ohneMieter);
    setSelectedMieterId(
      typeof data.selectedMieterId === "string" || data.selectedMieterId === null
        ? data.selectedMieterId
        : null
    );
    if (typeof data.mieterVorname === "string")
      setMieterVorname(data.mieterVorname);
    if (typeof data.mieterNachname === "string")
      setMieterNachname(data.mieterNachname);
    if (typeof data.mieterName === "string") setMieterName(data.mieterName);
    if (typeof data.mieterEmail === "string") setMieterEmail(data.mieterEmail);
    if (typeof data.mieterTel === "string") setMieterTel(data.mieterTel);
    if (typeof data.mieterStrasse === "string")
      setMieterStrasse(data.mieterStrasse);
    if (typeof data.mieterHausnummer === "string")
      setMieterHausnummer(data.mieterHausnummer);
    if (typeof data.mieterPlz === "string") setMieterPlz(data.mieterPlz);
    if (typeof data.mieterOrt === "string") setMieterOrt(data.mieterOrt);
    if (typeof data.regelnOk === "boolean") setRegelnOk(data.regelnOk);
    if (typeof data.hvAkut === "boolean") setHvAkut(data.hvAkut);
  }, []);

  /* FORM_ZWISCHENSTAND: melde-funnel */
  const {
    promptOpen: zwischenstandPromptOpen,
    promptTitle: zwischenstandPromptTitle,
    acceptRestore: zwischenAcceptRestore,
    declineRestore: zwischenDeclineRestore,
    clear: clearMeldeZwischenstand,
    savedHint: zwischenSavedHint,
  } = useFormZwischenstand<MeldeFunnelDraft>({
    storageKey: meldeZwischenstandKey,
    enabled: Boolean(melde),
    data: meldeDraftData,
    onRestore: onRestoreMeldeDraft,
  });

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
        portalToastError(TOAST.upload_fehlgeschlagen, msg);
        throw new Error(msg);
      }
      let json: { url?: string; error?: string } = {};
      try {
        json = (await res.json()) as { url?: string; error?: string };
      } catch {
        if (!res.ok) {
          const msg = "Upload fehlgeschlagen";
          portalToastError(TOAST.upload_fehlgeschlagen, msg);
          throw new Error(msg);
        }
      }
      if (!res.ok || !json.url) {
        const msg = json.error ?? "Upload fehlgeschlagen";
        portalToastError(TOAST.upload_fehlgeschlagen, msg);
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
        clearMeldeZwischenstand();
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
          portalToastError(TOAST.vorgang_nicht_erstellt, msg);
          return;
        }
        portalToastSuccess(TOAST.vorgang_erstellt);
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
          portalToastError(TOAST.anfrage_nicht_erstellt, msg);
          return;
        }
        portalToastSuccess(TOAST.anfrage_gesendet);
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
      portalToastSuccess(TOAST.anfrage_gesendet);
      onDone();
      navigatedAway = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Netzwerkfehler.";
      setError(msg);
      portalToastError(TOAST.senden_fehlgeschlagen, msg);
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

  return {
    channel,
    layout,
    stepLayout,
    busy,
    step,
    cfg,
    objekte,
    objektId,
    setObjektId,
    neuTitel,
    setNeuTitel,
    neuStrasse,
    setNeuStrasse,
    neuHausnummer,
    setNeuHausnummer,
    neuPlz,
    setNeuPlz,
    neuOrt,
    setNeuOrt,
    isHvIntern,
    mieterMode,
    setMieterMode,
    setOhneMieter,
    setSelectedMieterId,
    hvMieterListe,
    selectedMieterId,
    objekt,
    setMieterName,
    setMieterVorname,
    setMieterNachname,
    setMieterEmail,
    setMieterTel,
    setMieterStrasse,
    setMieterHausnummer,
    setMieterPlz,
    setMieterOrt,
    setEinheit,
    einheit,
    ohneMieter,
    mieterVorname,
    mieterNachname,
    mieterStrasse,
    mieterHausnummer,
    mieterPlz,
    mieterOrt,
    mieterEmail,
    mieterTel,
    situations,
    state,
    setState,
    useMeldeKaputtFlow,
    hvMitMieter,
    stripTerminInfos,
    setFachIdx,
    currentFachId,
    currentMeldeFrage,
    fachIdx,
    fachIds,
    patchFach,
    groesseConfig,
    groesseStepCopy,
    zustandStepDef,
    resolvedWebsiteSteps,
    patchProjekt,
    melde,
    regelnOk,
    setRegelnOk,
    reliablePrice,
    price,
    hvAkut,
    setHvAkut,
    suggestedHvAkut,
    summaryRows,
    error,
    setStep,
    resetMieterNeuForm,
    steps,
    goBack,
    goNext,
    createObjekt,
    createMieter,
    submit,
    canNext,
    neuBusy,
    zwischenstandPromptOpen,
    zwischenstandPromptTitle,
    zwischenAcceptRestore,
    zwischenDeclineRestore,
    zwischenSavedHint,
  };
}
