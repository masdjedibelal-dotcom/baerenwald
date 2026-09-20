"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { FachdetailsStep } from "@/components/funnel/FachdetailsStep";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { GroesseStep } from "@/components/funnel/GroesseStep";
import { MeldeDatenschutzHinweis } from "@/components/melden/MeldeDatenschutzHinweis";
import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";
import { PortalKiAssistField } from "@/components/shared/PortalKiAssistField";
import { PortalSheetConfirm } from "@/components/shared/PortalSheetConfirm";
import {
  asLibOpt,
  bereicheOptions,
  dringlichkeitOptions,
} from "@/components/funnel/portal-funnel-options";
import type { SummaryRow } from "@/components/funnel/portal-funnel-types";
import type { PortalFunnelHostModel } from "@/components/funnel/use-portal-funnel-host";
import { getMeldeFotoBeispiele } from "@/lib/funnel/melde-foto-beispiel";
import {
  BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND,
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
} from "@/lib/funnel/config";
import { groesseEinheitFromConfig } from "@/lib/funnel/groesse-config";
import {
  findResolvedStepDef,
  isPortalFunnelMidStepId,
  portalMidStepLabel,
} from "@/lib/funnel/portal-funnel-mid-steps";
import type {
  FachdetailsState,
  FunnelState,
  ObjektZustand,
  Situation,
  Zugaenglichkeit,
} from "@/lib/funnel/types";
import type { StepOption } from "@/lib/types";
import { formatCurrencyEUR } from "@/lib/price-calc";
import { CONFIRM } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

export function PortalFunnelHostView(m: PortalFunnelHostModel) {
  const {
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
  } = m;

  return (
    <div
      className={cn(
        "portal-funnel-host",
        layout === "modal" ? "portal-funnel-host--modal" : "portal-funnel-host--page"
      )}
    >
      {/* FORM_ZWISCHENSTAND: melde-funnel */}
      {zwischenSavedHint ? (
        <p className="px-4 pt-2 text-center text-xs text-text-secondary">
          {zwischenSavedHint}
        </p>
      ) : null}
      <PortalSheetConfirm
        open={zwischenstandPromptOpen}
        placement="standalone"
        title={zwischenstandPromptTitle}
        cancelLabel={CONFIRM.restoreDecline}
        confirmLabel={CONFIRM.restoreDraft}
        confirmVariant="primary"
        onCancel={zwischenDeclineRestore}
        onConfirm={zwischenAcceptRestore}
      />
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
                <span className="text-fs-caption font-semibold uppercase tracking-wide text-text-tertiary">
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
            <p className="mt-1 text-center text-fs-caption leading-snug text-text-tertiary">
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
            <p className="mt-1 text-center text-fs-caption leading-snug text-text-tertiary">
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
              <label className="flex items-start gap-2 text-fs-meta text-text-secondary">
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
              <p className="border-b border-border-light px-4 py-2.5 text-fs-caption font-bold uppercase tracking-wide text-text-tertiary">
                {hvMitMieter ? "Angaben zur Meldung" : "Ihre Angaben"}
              </p>
              <dl className="divide-y divide-border-light px-4">
                {summaryRows.map((row) => (
                  <div
                    key={`${row.label}-${row.value.slice(0, 24)}`}
                    className="flex justify-between gap-3 py-2.5 text-fs-meta"
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
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--fl-accent)]"
                  checked={hvAkut}
                  onChange={(e) => setHvAkut(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-fs-body font-semibold text-text-primary">
                    Akut / Sofortmaßnahme
                  </span>
                  <span className="mt-0.5 block text-fs-caption leading-snug text-text-secondary">
                    {suggestedHvAkut
                      ? "Vorschlag aus den Angaben — Häkchen setzen oder entfernen."
                      : "Optional setzen, wenn sofort gehandelt werden soll."}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-[var(--fl-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </StepWrapper>
      ) : null}

      {error && step !== "result" ? (
        <p className="mt-2 text-sm text-[var(--fl-danger)]" role="alert">
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
          <PortalIcon n="plus" ctx="default" className="h-6 w-6" aria-hidden />
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
          <PortalIcon n="plus" ctx="default" className="h-6 w-6" aria-hidden />
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
