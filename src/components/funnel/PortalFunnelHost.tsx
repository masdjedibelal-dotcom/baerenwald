"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FachdetailsStep } from "@/components/funnel/FachdetailsStep";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import {
  buildBwLeadPayload,
  serializeFunnelStateForLead,
  submitBwLead,
} from "@/components/funnel/LeadStep";
import { SITUATIONEN_CONFIG } from "@/lib/funnel/config";
import {
  getActiveFachdetailQuestionIds,
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
};

function bereicheOptions(situation: Situation): StepOption[] {
  const steps = SITUATIONEN_CONFIG[situation]?.steps ?? [];
  const s = steps.find((x) => x.id.includes("bereiche"));
  return (s?.options ?? []) as StepOption[];
}

function dringlichkeitOptions(): StepOption[] {
  const steps = SITUATIONEN_CONFIG.kaputt.steps;
  const s = steps.find((x) => x.id === "kaputt_dringlichkeit");
  return (s?.options ?? []) as StepOption[];
}

/**
 * Gemeinsamer Portal-/Melde-Funnel auf Basis Website-Design.
 * Trust/GPT entfallen; Felder und Preis je `funnelVariant(channel)`.
 */
export function PortalFunnelHost({
  channel,
  title,
  objekte: objekteProp = [],
  prefill,
  melde,
  onClose,
  onDone,
  onObjekteChanged,
}: Props) {
  const router = useRouter();
  const cfg = funnelVariant(channel);
  const [objekte, setObjekte] = useState(objekteProp);

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
  const [mieterName, setMieterName] = useState(prefill?.name ?? "");
  const [mieterEmail, setMieterEmail] = useState(prefill?.email ?? "");
  const [mieterTel, setMieterTel] = useState(prefill?.telefon ?? "");
  const [einheit, setEinheit] = useState(prefill?.einheit ?? "");

  const [neuTitel, setNeuTitel] = useState("");
  const [neuStrasse, setNeuStrasse] = useState("");
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
    out.push("fachdetail");
    if (cfg.include.photos) out.push("medien");
    if (cfg.include.beschreibung) out.push("beschreibung");
    /** Privat: PLZ vor Ergebnis (kein Objekt-Prefix). */
    if (cfg.include.ortPlz && channel === "portal_privat") {
      /* PLZ im Kontakt-ähnlichen Block vor result — reuse kontakt fields */
      out.push("kontakt");
    } else if (channel === "melde_anon") {
      out.push("kontakt");
    } else if (
      channel === "portal_mieter" &&
      cfg.prefix.mieter !== "prefilled"
    ) {
      out.push("kontakt");
    }
    out.push("result");
    return out;
  }, [cfg, state.situation, channel]);

  const steps = buildStepOrder();

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
      return neuTitel.trim().length > 1 && neuPlz.trim().length >= 4;
    }
    if (step === "mieter") {
      if (ohneMieter && cfg.prefix.mieter === "ohne_erlaubt") return true;
      if (ohneMieter && cfg.prefix.mieter === "optional") return true;
      return (
        mieterName.trim().length > 1 && mieterEmail.trim().includes("@")
      );
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
      return (state.leadBeschreibung || "").trim().length >= 10;
    }
    if (step === "kontakt") {
      if (cfg.include.ortPlz && state.plz.trim().length < 4) return false;
      return (
        state.name.trim().length > 1 &&
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
        const payload = isErgaenzen
          ? {
              token: melde.ergaenzenToken,
              name: state.name.trim() || mieterName.trim(),
              email: state.email.trim() || mieterEmail.trim(),
              telefon: state.telefon.trim() || mieterTel.trim() || undefined,
              einheit: einheit.trim() || undefined,
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
              name: state.name.trim() || mieterName.trim(),
              email: state.email.trim() || mieterEmail.trim(),
              telefon: state.telefon.trim() || mieterTel.trim() || undefined,
              einheit: einheit.trim() || undefined,
              kategorie: notfall ? "notfall" : "reparatur",
              bereichId,
              fachdetailAnswers: state.fachdetails?.fachdetailAnswers ?? {},
              notfall,
              beschreibung: state.leadBeschreibung.trim(),
              fotos,
              ...(state.dringlichkeit
                ? { dringlichkeit: state.dringlichkeit }
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
        if (json.statusLink) q.set("statusLink", json.statusLink);
        else if (json.meldeTrackingToken) {
          q.set("token", json.meldeTrackingToken);
        }
        router.push(`/melden/bestaetigung?${q.toString()}`);
        onDone();
        return;
      }

      if (channel === "portal_hv") {
        if (!objektId || !state.situation) return;
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
            name: prefill?.name,
            email: prefill?.email,
            beschreibung: [
              state.leadBeschreibung.trim(),
              ohneMieter
                ? "Ohne Mieterbezug"
                : `Mieter: ${mieterName} · ${mieterEmail} · ${mieterTel || "—"}`,
              einheit.trim() ? `Einheit: ${einheit.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            telefon: mieterTel || undefined,
            funnel_daten: {
              channel,
              fachdetails: state.fachdetails,
              dringlichkeit: state.dringlichkeit,
              ohne_mieter: ohneMieter,
            },
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Absenden fehlgeschlagen.");
          portalToastError("Vorgang nicht erstellt", json.error);
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
          strasse: state.strasse || objekt?.strasse || undefined,
          hausnummer: state.hausnummer || objekt?.hausnummer || undefined,
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  };

  const situations = BW_FUNNEL_STEP1_OPTIONS.filter((o) => o.id !== "gewerbe");

  const headline =
    title ??
    (channel === "melde_anon" || channel === "portal_mieter"
      ? "Schaden melden"
      : channel === "portal_eigentuemer"
        ? "Anfrage erstellen"
        : "Neuer Vorgang");

  return (
    <div className="flex min-h-[65vh] flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-[13px] font-semibold text-text-secondary"
          onClick={goBack}
        >
          ‹ Zurück
        </button>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
          {headline}
        </p>
        <span className="w-14" />
      </div>

      {step === "objekt" ? (
        <StepWrapper
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
            {cfg.prefix.objektNeu ? (
              <button
                type="button"
                className="rounded-[9px] border border-dashed border-border-default px-3 py-3 text-left text-[13px] font-semibold text-accent"
                onClick={() => setStep("objekt_neu")}
              >
                + Neues Objekt anlegen
              </button>
            ) : null}
            {objekte.length === 0 && !cfg.prefix.objektNeu ? (
              <p className="text-sm text-text-secondary">
                Keine Objekte verfügbar.
              </p>
            ) : null}
          </div>
        </StepWrapper>
      ) : null}

      {step === "objekt_neu" ? (
        <StepWrapper
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
            <input
              className="funnel-input w-full"
              placeholder="Straße"
              value={neuStrasse}
              onChange={(e) => setNeuStrasse(e.target.value)}
            />
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
          stepLabel="Mieter"
          question="Mieter zuordnen?"
          subtext={
            cfg.prefix.einheit
              ? "Optional Einheit angeben"
              : "Optional — oder ohne Mieter"
          }
          animateKey="mieter"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {cfg.prefix.mieter === "ohne_erlaubt" ||
            cfg.prefix.mieter === "optional" ? (
              <SelectionTile
                option={{
                  value: "ohne",
                  label: "Ohne Mieter",
                  hint: "Interner Vorgang",
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
                <input
                  className="funnel-input w-full"
                  placeholder="Name"
                  value={mieterName}
                  onChange={(e) => setMieterName(e.target.value)}
                />
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
        </StepWrapper>
      ) : null}

      {step === "situation" ? (
        <StepWrapper
          stepLabel="Anliegen"
          question="Worum geht es?"
          animateKey="situation"
        >
          <div className="funnel-step-tiles-card grid gap-2 sm:grid-cols-2">
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
          stepLabel="Bereich"
          question="Was ist betroffen?"
          animateKey="bereiche"
        >
          <div className="funnel-step-tiles-card grid gap-2 sm:grid-cols-2">
            {bereicheOptions(state.situation).map((o) => (
              <SelectionTile
                key={o.value}
                option={o}
                multi={false}
                selected={state.bereiche.includes(o.value)}
                onChange={(v) =>
                  setState((s) => ({
                    ...s,
                    bereiche: [v],
                    fachdetails: {},
                  }))
                }
              />
            ))}
          </div>
        </StepWrapper>
      ) : null}

      {step === "dringlichkeit" ? (
        <StepWrapper
          stepLabel="Dringlichkeit"
          question="Wie dringend ist es?"
          animateKey="dringlichkeit"
        >
          <div className="funnel-step-tiles-card flex flex-col gap-2">
            {dringlichkeitOptions().map((o) => (
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
        />
      ) : null}

      {step === "fachdetail" && !currentFachId ? (
        <StepWrapper
          stepLabel="Details"
          question="Keine weiteren Fachfragen"
          animateKey="fach-empty"
        >
          <p className="text-sm text-text-secondary">
            Weiter zur Beschreibung.
          </p>
        </StepWrapper>
      ) : null}

      {step === "medien" ? (
        <StepWrapper
          stepLabel="Fotos"
          question="Fotos hinzufügen"
          subtext="Optional — hilft bei der Einschätzung"
          animateKey="medien"
        >
          <PhotoUpload
            files={state.photos}
            onChange={(files) => setState((s) => ({ ...s, photos: files }))}
          />
        </StepWrapper>
      ) : null}

      {step === "beschreibung" ? (
        <StepWrapper
          stepLabel="Beschreibung"
          question="Was ist passiert?"
          subtext="Mindestens 10 Zeichen"
          animateKey="beschreibung"
        >
          <textarea
            className="funnel-input min-h-[120px] w-full"
            value={state.leadBeschreibung}
            onChange={(e) =>
              setState((s) => ({ ...s, leadBeschreibung: e.target.value }))
            }
            placeholder="Kurz beschreiben…"
          />
        </StepWrapper>
      ) : null}

      {step === "kontakt" ? (
        <StepWrapper
          stepLabel={cfg.include.ortPlz ? "Ort & Kontakt" : "Kontakt"}
          question={
            cfg.include.ortPlz
              ? "Wo und wie erreichen wir dich?"
              : "Ihre Kontaktdaten"
          }
          animateKey="kontakt"
        >
          <div className="space-y-2">
            {cfg.include.ortPlz ? (
              <>
                <input
                  className="funnel-input w-full"
                  placeholder="PLZ"
                  value={state.plz}
                  onChange={(e) =>
                    setState((s) => ({ ...s, plz: e.target.value }))
                  }
                />
                <div className="grid grid-cols-[1fr_88px] gap-2">
                  <input
                    className="funnel-input"
                    placeholder="Straße"
                    value={state.strasse}
                    onChange={(e) =>
                      setState((s) => ({ ...s, strasse: e.target.value }))
                    }
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
              </>
            ) : null}
            <input
              className="funnel-input w-full"
              placeholder="Name"
              value={state.name}
              onChange={(e) =>
                setState((s) => ({ ...s, name: e.target.value }))
              }
            />
            <input
              className="funnel-input w-full"
              type="email"
              placeholder="E-Mail"
              value={state.email}
              onChange={(e) =>
                setState((s) => ({ ...s, email: e.target.value }))
              }
            />
            <input
              className="funnel-input w-full"
              type="tel"
              placeholder="Telefon (optional)"
              value={state.telefon}
              onChange={(e) =>
                setState((s) => ({ ...s, telefon: e.target.value }))
              }
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
            {cfg.prefix.einheit && channel === "melde_anon" ? (
              <input
                className="funnel-input w-full"
                placeholder="Einheit / Wohnung (optional)"
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
              />
            ) : null}
          </div>
        </StepWrapper>
      ) : null}

      {step === "result" ? (
        <StepWrapper
          stepLabel="Abschluss"
          question={cfg.showPrice ? "Preisrahmen" : "Prüfen & absenden"}
          subtext={
            cfg.showPrice
              ? "Indikation — verbindlich nach Prüfung"
              : "Angaben prüfen und absenden"
          }
          animateKey="result"
        >
          {cfg.showPrice ? (
            <div className="rounded-xl border border-border-default bg-white p-4">
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
          ) : (
            <div className="rounded-xl bg-[#f7f8fa] p-4 text-sm space-y-1">
              <p>
                <b>Bereich:</b> {state.bereiche.join(", ") || "—"}
              </p>
              <p>
                <b>Dringlichkeit:</b> {state.dringlichkeit || "—"}
              </p>
              <p>
                <b>Beschreibung:</b> {state.leadBeschreibung || "—"}
              </p>
            </div>
          )}
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

      <div className={cn("mt-auto flex gap-2 pt-6")}>
        {step === "objekt_neu" ? (
          <button
            type="button"
            className="btn-pill-primary flex-1 disabled:opacity-40"
            disabled={!canNext() || neuBusy}
            onClick={() => void createObjekt()}
          >
            {neuBusy ? "Speichern…" : "Objekt speichern →"}
          </button>
        ) : step !== "result" ? (
          <button
            type="button"
            className="btn-pill-primary flex-1 disabled:opacity-40"
            disabled={!canNext()}
            onClick={goNext}
          >
            Weiter →
          </button>
        ) : (
          <button
            type="button"
            className="btn-pill-primary flex-1 disabled:opacity-40"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Wird gesendet…" : "Absenden →"}
          </button>
        )}
      </div>
    </div>
  );
}
