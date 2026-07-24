"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import "@/app/funnel-ui.css";

import { FachdetailsStep } from "@/components/funnel/FachdetailsStep";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import {
  buildBwLeadPayload,
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import { SITUATIONEN_CONFIG } from "@/lib/funnel/config";
import {
  getActiveFachdetailQuestionIds,
  getActiveFachdetailQuestions,
} from "@/lib/funnel/fachdetail-questions-flat";
import {
  funnelVariant,
  type FunnelChannel,
} from "@/lib/funnel/funnel-variant";
import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import { calculatePrice } from "@/lib/funnel/price-calc";
import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import type {
  FachdetailsState,
  FunnelState,
  Situation,
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
  | "situation"
  | "bereiche"
  | "dringlichkeit"
  | "fachdetail"
  | "medien"
  | "beschreibung"
  | "kontakt"
  | "result";

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

function bereicheOptions(situation: Situation): StepOption[] {
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
  /** Melde / Mieter / HV: keine Termin-/SLA-Infoboxen unter den Optionen. */
  const stripTerminInfos =
    channel === "melde_anon" ||
    channel === "portal_mieter" ||
    isHvIntern;

  useEffect(() => {
    if (!isHvIntern || !objektId) {
      setHvMieterListe([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/org/einheit-bewohner?objektId=${encodeURIComponent(objektId)}`
        );
        const json = (await res.json()) as {
          bewohner?: Array<{
            id: string;
            name: string;
            email?: string | null;
            telefon?: string | null;
            objekt_einheiten?: { bezeichnung?: string | null } | null;
          }>;
        };
        if (cancelled) return;
        setHvMieterListe(
          (json.bewohner ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            email: b.email,
            telefon: b.telefon,
            einheitLabel: b.objekt_einheiten?.bezeichnung ?? null,
          }))
        );
      } catch {
        if (!cancelled) setHvMieterListe([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHvIntern, objektId]);

  const fachIds = useMemo(
    () => getActiveFachdetailQuestionIds(state),
    [state]
  );
  const currentFachId = fachIds[fachIdx] ?? null;

  const price = useMemo(() => {
    if (!cfg.showPrice || !state.situation || state.bereiche.length === 0) {
      return null;
    }
    const plz =
      state.plz.trim() ||
      objekt?.plz?.trim() ||
      prefill?.plz?.trim() ||
      "80331";
    try {
      return calculatePrice({
        ...state,
        plz,
        zeitraum: state.zeitraum ?? state.dringlichkeit ?? "flexibel",
      });
    } catch {
      return null;
    }
  }, [cfg.showPrice, state, objekt?.plz, prefill?.plz]);

  const patchFach = useCallback((patch: Partial<FachdetailsState>) => {
    setState((s) => ({
      ...s,
      fachdetails: { ...s.fachdetails, ...patch },
    }));
  }, []);

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
    if (cfg.include.notfallDringlichkeit && state.situation === "kaputt") {
      out.push("dringlichkeit");
    }
    if (getActiveFachdetailQuestionIds(state).length > 0) {
      out.push("fachdetail");
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
  }, [cfg, state, channel]);

  const steps = buildStepOrder();

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
      const opts = bereicheOptions(state.situation);
      push(
        "Bereich",
        state.bereiche.map((b) => optionLabel(opts, b)).join(", ")
      );
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

    for (const q of getActiveFachdetailQuestions(state)) {
      const raw = state.fachdetails?.fachdetailAnswers?.[q.id];
      push(q.frage, fachAnswerLabel(q.optionen, raw));
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
  ]);

  const goNext = () => {
    setError(null);
    if (step === "fachdetail") {
      if (currentFachId) {
        const ans = state.fachdetails?.fachdetailAnswers?.[currentFachId];
        if (ans == null || ans === "") return;
      }
      if (fachIdx < fachIds.length - 1) {
        setFachIdx((i) => i + 1);
        return;
      }
    }
    const i = steps.indexOf(step === "objekt_neu" ? "objekt" : step);
    const next = steps[i + 1];
    if (!next) return;
    if (next === "fachdetail") {
      setFachIdx(0);
      if (getActiveFachdetailQuestionIds(state).length === 0) {
        const after = steps[i + 2];
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
    if (step === "fachdetail" && fachIdx > 0) {
      setFachIdx((i) => i - 1);
      return;
    }
    const i = steps.indexOf(step);
    if (i <= 0) {
      if (melde?.objektLocked) return;
      onClose();
      return;
    }
    const prev = steps[i - 1]!;
    if (prev === "fachdetail") {
      const ids = getActiveFachdetailQuestionIds(state);
      setFachIdx(Math.max(0, ids.length - 1));
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
      const res = await fetch("/api/org/objekte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: neuTitel.trim(),
          strasse: neuStrasse.trim() || undefined,
          hausnummer: neuHausnummer.trim() || undefined,
          plz: neuPlz.trim(),
          ort: neuOrt.trim() || undefined,
          melde_aktiv: true,
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
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload fehlgeschlagen");
      urls.push(json.url);
    }
    return urls;
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    let navigatedAway = false;
    try {
      if (channel === "melde_anon" && melde) {
        const bereich = state.bereiche[0] ?? "sonstiges";
        const bereichId = kaputtBereichToMeldeId(bereich);
        const notfall = state.dringlichkeit === "sofort";
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
              kategorie: notfall ? "notfall" : "reparatur",
              bereichId,
              fachdetailAnswers: state.fachdetails?.fachdetailAnswers ?? {},
              notfall,
              beschreibung: state.leadBeschreibung.trim(),
              fotos,
            }
          : {
              org: melde.orgKennung,
              objekt: melde.objektSlug,
              name: contactName,
              email: state.email.trim() || mieterEmail.trim(),
              telefon: state.telefon.trim() || mieterTel.trim() || undefined,
              kategorie: notfall ? "notfall" : "reparatur",
              bereichId,
              fachdetailAnswers: state.fachdetails?.fachdetailAnswers ?? {},
              notfall,
              beschreibung: state.leadBeschreibung.trim(),
              fotos,
              ...(state.dringlichkeit
                ? { dringlichkeit: state.dringlichkeit }
                : {}),
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
        };
        if (!res.ok) {
          setError(json.error ?? "Senden fehlgeschlagen.");
          return;
        }
        if (!isErgaenzen) {
          track.meldeAbgeschickt(
            notfall ? "notfall" : "reparatur",
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
        const contactEmail = state.email.trim() || mieterEmail.trim();
        const contactTel = state.telefon.trim() || mieterTel.trim();
        if (contactName) q.set("name", contactName);
        if (contactEmail) q.set("email", contactEmail);
        if (contactTel) q.set("telefon", contactTel);
        router.push(`/melden/bestaetigung?${q.toString()}`);
        onDone();
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
            preis_min: price?.min ?? 0,
            preis_max: price?.max ?? 0,
            zeitraum: state.dringlichkeit || state.zeitraum || null,
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
              dringlichkeit: state.dringlichkeit,
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

      /* privat / eigentuemer / portal_mieter (registriert ohne melde) */
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
          preis_min: price?.min ?? 0,
          preis_max: price?.max ?? 0,
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
      setError(e instanceof Error ? e.message : "Netzwerkfehler.");
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
          headerAction={
            cfg.prefix.objektNeu ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-white text-accent shadow-sm transition-colors hover:border-accent hover:bg-accent-light"
                aria-label="Neues Objekt anlegen"
                title="Neues Objekt anlegen"
                onClick={() => setStep("objekt_neu")}
              >
                <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null
          }
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
                Noch kein Objekt — legen Sie eines über + an.
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
                {cfg.prefix.mieterNeu ? (
                  <button
                    type="button"
                    className="rounded-full border border-border-default bg-white px-3 py-1 text-[12px] font-semibold text-accent"
                    onClick={() => {
                      setMieterMode("neu");
                      setOhneMieter(false);
                      setSelectedMieterId(null);
                      resetMieterNeuForm(objekt);
                    }}
                  >
                    + Neu
                  </button>
                ) : null}
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
                    label: m.name,
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
              {mieterMode === "neu" ? (
                <div className="mt-2 space-y-2 border-t border-border-light pt-3">
                  <p className="text-[13px] font-semibold text-text-primary">
                    Neuer Mieter
                  </p>
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
                      autoComplete="address-line1"
                    />
                    <input
                      className="funnel-input"
                      placeholder="Nr."
                      value={mieterHausnummer}
                      onChange={(e) => setMieterHausnummer(e.target.value)}
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
              <input
                className="funnel-input mt-2 w-full"
                placeholder="Einheit / Wohnung (optional)"
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
              />
            ) : null}
          </div>
          )}
        </StepWrapper>
      ) : null}

      {step === "situation" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Anliegen"
          question="Worum geht es?"
          animateKey="situation"
        >
          <div className="funnel-step-tiles-card grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
          animateKey="bereiche"
        >
          <div className="funnel-step-tiles-card grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {bereicheOptions(state.situation).map((o) => {
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
                onChange={(v) =>
                  setState((s) => ({
                    ...s,
                    bereiche: [v],
                    fachdetails: {},
                  }))
                }
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

      {step === "fachdetail" && currentFachId ? (
        <FachdetailsStep
          questionId={currentFachId}
          state={state}
          onPatch={patchFach}
          showOmitHint={false}
          detailIndex={fachIdx}
          detailTotal={Math.max(1, fachIds.length)}
          animateKey={currentFachId}
          stripInfoBoxes={stripTerminInfos}
        />
      ) : null}

      {step === "medien" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Fotos"
          question="Fotos hinzufügen"
          subtext="Optional — hilft bei der Einschätzung"
          animateKey="medien"
        >
          <PhotoUpload
            files={state.photos}
            onChange={(files) => setState((s) => ({ ...s, photos: files }))}
            buttonTitle={
              channel === "melde_anon" ||
              channel === "portal_mieter" ||
              isHvIntern
                ? "Fotos hochladen"
                : "Fotos oder Vergleichsangebote hochladen"
            }
            buttonHint={
              channel === "melde_anon" ||
              channel === "portal_mieter" ||
              isHvIntern
                ? "Fotos vom Schaden oder Objekt — optional"
                : undefined
            }
            showCompareOfferHint={false}
          />
        </StepWrapper>
      ) : null}

      {step === "beschreibung" ? (
        <StepWrapper
          layout={stepLayout}
          stepLabel="Beschreibung"
          question={
            state.situation === "erneuern"
              ? "Beschreibung"
              : "Was ist passiert?"
          }
          subtext={
            state.situation === "erneuern"
              ? "Willst du uns noch was mitteilen?"
              : "Mindestens 10 Zeichen"
          }
          animateKey="beschreibung"
        >
          <textarea
            className="funnel-input min-h-[120px] w-full"
            value={state.leadBeschreibung}
            onChange={(e) =>
              setState((s) => ({ ...s, leadBeschreibung: e.target.value }))
            }
            placeholder={
              state.situation === "erneuern"
                ? "Optional — z. B. Wunschtermin, Besonderheiten …"
                : "Beschreiben Sie den Schaden oder das Anliegen …"
            }
          />
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
                {price ? (
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
                    {formatCurrencyEUR(price.min)} –{" "}
                    {formatCurrencyEUR(price.max)}
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Preisrahmen wird nach Prüfung mitgeteilt.
                  </p>
                )}
              </div>
            ) : null}

            <div className="funnel-card-float overflow-hidden">
              <p className="border-b border-border-light px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-text-tertiary">
                Ihre Angaben
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
            : step === "result"
              ? () => void submit()
              : goNext
        }
        nextDisabled={
          step === "objekt_neu"
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
