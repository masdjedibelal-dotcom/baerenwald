"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import { PartnerDirektKameraSlot } from "@/components/partner/PartnerDirektKameraSlot";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PartnerMultiFotoSlot } from "@/components/partner/PartnerMultiFotoSlot";
import {
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  addPartnerPositionFortschritt,
  completePartnerPosition,
  createPartnerWeitereArbeit,
  startPartnerPosition,
} from "@/app/actions/partner-position-eintraege";
import { normalizePartnerCameraPhoto } from "@/lib/partner/normalize-camera-photo";
import {
  formatZeitMinuten,
  lebenszyklusLabel,
} from "@/lib/partner/position-lebenszyklus";
import { HW_DOKU_STORY } from "@/lib/portal2/hw-doku-story";
import { PORTAL_C, PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

export type LebenszyklusPosition = {
  id: string;
  leistung_name: string;
  leistung_status?: string | null;
  verguetung?: string | null;
  typ?: string | null;
  anerkennung_status?: string | null;
  preis_partner?: number | null;
  einheit?: string | null;
  menge?: number | null;
  zeit_minuten_summe?: number | null;
};

type SheetMode = "start" | "fortschritt" | "erledigt";

type Props = {
  auftragId: string;
  positionen: LebenszyklusPosition[];
  onDone?: () => void | Promise<void>;
  preferredPositionIds?: string[];
  anfrageId?: string | null;
  auftragTitel?: string | null;
  /** Deep-Link: erstes bevorzugtes Sheet öffnen */
  autoOpenPreferred?: boolean;
};

function mengeLabel(p: LebenszyklusPosition): string | null {
  if (p.einheit && p.menge != null) return `${p.menge} ${p.einheit}`;
  return null;
}

/**
 * Mock-Flow: Leistungskarten mit CTA → Bottom Sheet (Foto + Beschreibung).
 */
export function PartnerPositionLebenszyklusList({
  auftragId,
  positionen,
  onDone,
  preferredPositionIds = [],
  anfrageId,
  auftragTitel,
  autoOpenPreferred = false,
}: Props) {
  const [sheet, setSheet] = useState<{
    mode: SheetMode;
    position: LebenszyklusPosition;
  } | null>(null);
  const [nachtragOpen, setNachtragOpen] = useState(false);
  const [nachtragTitel, setNachtragTitel] = useState("");
  const [nachtragBegruendung, setNachtragBegruendung] = useState("");
  const [nachtragEur, setNachtragEur] = useState("");
  const [nachtragHours, setNachtragHours] = useState(0);
  const [nachtragMins, setNachtragMins] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [beschreibung, setBeschreibung] = useState("");
  const [erledigtFotos, setErledigtFotos] = useState<File[]>([]);
  const autoOpenedRef = useRef(false);
  const sheetFormRef = useRef<HTMLFormElement>(null);
  const { runBusy } = usePortalBusy();
  const preferredSet = useMemo(
    () => new Set(preferredPositionIds.map((id) => id.trim()).filter(Boolean)),
    [preferredPositionIds]
  );

  const sortedPositionen = useMemo(() => {
    if (!preferredSet.size) return positionen;
    return [...positionen].sort((a, b) => {
      const ap = preferredSet.has(a.id) ? 0 : 1;
      const bp = preferredSet.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [positionen, preferredSet]);

  const actionablePositionen = useMemo(
    () =>
      sortedPositionen.filter(
        (p) =>
          p.anerkennung_status !== "in_pruefung" &&
          p.anerkennung_status !== "abgelehnt"
      ),
    [sortedPositionen]
  );
  const erledigtCount = useMemo(
    () =>
      actionablePositionen.filter((p) => p.leistung_status === "erledigt").length,
    [actionablePositionen]
  );
  const progressPct =
    actionablePositionen.length > 0
      ? Math.round((erledigtCount / actionablePositionen.length) * 100)
      : 0;

  useEffect(() => {
    if (!autoOpenPreferred || autoOpenedRef.current || !preferredSet.size) return;
    const target = sortedPositionen.find(
      (p) => preferredSet.has(p.id) && p.leistung_status !== "erledigt"
    );
    if (!target) return;
    autoOpenedRef.current = true;
    const st = target.leistung_status ?? "offen";
    setSheet({
      mode: st === "in_arbeit" ? "fortschritt" : "start",
      position: target,
    });
  }, [autoOpenPreferred, preferredSet, sortedPositionen]);

  useEffect(() => {
    setBeschreibung("");
    setErledigtFotos([]);
  }, [sheet?.position.id, sheet?.mode]);

  async function normalizeFotoField(
    formData: FormData,
    field: string
  ): Promise<boolean> {
    const raw = formData.get(field);
    if (!(raw instanceof File) || raw.size <= 0) return true;
    try {
      formData.set(field, await normalizePartnerCameraPhoto(raw));
      return true;
    } catch {
      portalToastError(
        "Foto konnte nicht verarbeitet werden. Bitte erneut versuchen."
      );
      return false;
    }
  }

  function submitSheet(formData: FormData) {
    if (!sheet?.mode || submitting) return;
    if (anfrageId) formData.set("anfrageId", anfrageId);
    const sheetIsRegie =
      sheet.position.typ === "regie" ||
      sheet.position.verguetung === "aufwand";
    const mode = sheet.mode;
    const positionId = sheet.position.id;

    setSubmitting(true);
    void (async () => {
      let ok = false;
      try {
        await runBusy(async () => {
          // Regie: Start-/Ende-Slots → einheitlich als foto / foto_ende
          const startSlot = formData.get("foto_start");
          if (startSlot instanceof File && startSlot.size > 0) {
            formData.set("foto", startSlot);
          }
          if (!(await normalizeFotoField(formData, "foto"))) return;
          if (!(await normalizeFotoField(formData, "foto_ende"))) return;

          const captureStart =
            String(formData.get("captureAt_start") ?? "").trim() ||
            String(formData.get("captureAt") ?? "").trim();
          if (captureStart) formData.set("captureAt", captureStart);

          const endeFoto = formData.get("foto_ende");
          const hasEnde =
            endeFoto instanceof File && endeFoto.size > 0 && sheetIsRegie;

          if (mode === "erledigt" && !sheetIsRegie && erledigtFotos.length) {
            formData.delete("fotos");
            formData.delete("foto");
            for (const f of erledigtFotos.slice(0, 5)) {
              formData.append("fotos", f);
            }
          }

          try {
            if (mode === "start") {
              const startRes = await startPartnerPosition(formData);
              if (!startRes.ok) {
                portalToastError(startRes.error);
                return;
              }
              if (hasEnde) {
                const endeFd = new FormData();
                endeFd.set("positionId", positionId);
                if (anfrageId) endeFd.set("anfrageId", anfrageId);
                endeFd.set("foto", endeFoto);
                const captureEnde = String(
                  formData.get("captureAt_ende") ?? ""
                ).trim();
                if (captureEnde) endeFd.set("captureAt", captureEnde);
                const beschr = String(formData.get("beschreibung") ?? "").trim();
                if (beschr) endeFd.set("beschreibung", beschr);
                const zeitStd = formData.get("zeitStd");
                const zeitMin = formData.get("zeitMin");
                if (zeitStd != null) endeFd.set("zeitStd", String(zeitStd));
                if (zeitMin != null) endeFd.set("zeitMin", String(zeitMin));
                const endeRes = await completePartnerPosition(endeFd);
                if (!endeRes.ok) {
                  portalToastError(endeRes.error);
                  await onDone?.();
                  return;
                }
              }
              portalToastSuccess(
                hasEnde ? HW_DOKU_STORY.positionEndeToast : "Start gespeichert."
              );
            } else if (mode === "fortschritt") {
              const res = await addPartnerPositionFortschritt(formData);
              if (!res.ok) {
                portalToastError(res.error);
                return;
              }
              portalToastSuccess("Update gespeichert.");
            } else {
              if (
                hasEnde &&
                (!(formData.get("foto") instanceof File) ||
                  (formData.get("foto") instanceof File &&
                    (formData.get("foto") as File).size <= 0))
              ) {
                formData.set("foto", endeFoto);
                const captureEnde = String(
                  formData.get("captureAt_ende") ?? ""
                ).trim();
                if (captureEnde) formData.set("captureAt", captureEnde);
              }
              const res = await completePartnerPosition(formData);
              if (!res.ok) {
                portalToastError(res.error);
                return;
              }
              portalToastSuccess(HW_DOKU_STORY.positionEndeToast);
            }
          } catch {
            portalToastError(
              "Speichern fehlgeschlagen — Foto zu groß oder Verbindung unterbrochen. Bitte erneut versuchen."
            );
            return;
          }

          ok = true;
          await onDone?.();
          setSheet(null);
          setBeschreibung("");
          setErledigtFotos([]);
        }, Math.max(PORTAL_BUSY_MIN_MS, 600));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function closeNachtrag() {
    if (submitting) return;
    setNachtragOpen(false);
    setNachtragTitel("");
    setNachtragBegruendung("");
    setNachtragEur("");
    setNachtragHours(0);
    setNachtragMins(0);
  }

  function submitNachtrag() {
    if (nachtragTitel.trim().length < 4) {
      portalToastError("Titel mind. 4 Zeichen.");
      return;
    }
    if (nachtragBegruendung.trim().length < 8) {
      portalToastError("Begründung mind. 8 Zeichen.");
      return;
    }
    const formData = new FormData();
    formData.set("auftragId", auftragId);
    formData.set("titel", nachtragTitel.trim());
    formData.set("begruendung", nachtragBegruendung.trim());
    if (nachtragEur.trim()) formData.set("schaetzungEur", nachtragEur.trim());
    const totalMin = nachtragHours * 60 + nachtragMins;
    if (totalMin > 0) formData.set("schaetzungMinuten", String(totalMin));
    if (submitting) return;
    setSubmitting(true);
    void (async () => {
      try {
        await runBusy(async () => {
          const res = await createPartnerWeitereArbeit(formData);
          if (!res.ok) {
            portalToastError(res.error);
            return;
          }
          portalToastSuccess(
            "Nachtrag eingereicht — noch zur Prüfung durch Bärenwald."
          );
          await onDone?.();
          setNachtragOpen(false);
          setNachtragTitel("");
          setNachtragBegruendung("");
          setNachtragEur("");
          setNachtragHours(0);
          setNachtragMins(0);
        }, Math.max(PORTAL_BUSY_MIN_MS, 600));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function closeSheet() {
    if (submitting) return;
    setSheet(null);
    setBeschreibung("");
    setErledigtFotos([]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-[20px] font-bold leading-tight"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          {HW_DOKU_STORY.title}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold" style={{ color: PORTAL_VAR.sub }}>
            Fortschritt
          </p>
          <p className="text-[12.5px] font-semibold" style={{ color: PORTAL_VAR.sub }}>
            {erledigtCount} von {actionablePositionen.length} erledigt
          </p>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full"
          style={{ background: PORTAL_C.line2 }}
          role="progressbar"
          aria-valuenow={erledigtCount}
          aria-valuemin={0}
          aria-valuemax={actionablePositionen.length}
          aria-valuetext={`${progressPct} Prozent`}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${Math.max(0, Math.min(100, progressPct))}%`,
              backgroundColor: PORTAL_C.primary,
            }}
          />
        </div>
      </div>

      {preferredSet.size > 0 ? (
        <p
          className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-[13.5px] font-bold leading-snug text-amber-950"
          role="status"
        >
          {HW_DOKU_STORY.preferredBanner}
        </p>
      ) : null}

      {sortedPositionen.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-4 py-5 text-center"
          style={{ borderColor: PORTAL_VAR.line }}
          data-testid="hw-first-job-empty"
        >
          <p className="text-[14px] font-bold" style={{ color: PORTAL_VAR.ink }}>
            Noch keine Leistung
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sortedPositionen.map((p) => {
            const st = p.leistung_status ?? "offen";
            const isArbeit = st === "in_arbeit";
            const isErledigt = st === "erledigt";
            const isAufwand = p.verguetung === "aufwand";
            const isRegie = p.typ === "regie" || isAufwand;
            const isPreferred = preferredSet.has(p.id);
            const inPruefung = p.anerkennung_status === "in_pruefung";
            const isAbgelehnt = p.anerkennung_status === "abgelehnt";
            const isBlocked = inPruefung || isAbgelehnt;
            const meta = [
              inPruefung
                ? "Noch zur Prüfung"
                : isAbgelehnt
                  ? "Abgelehnt"
                  : lebenszyklusLabel(st),
              mengeLabel(p),
              isPreferred && !isBlocked ? "Update angefordert" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={p.id}
                className={cn(
                  "rounded-xl border px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]",
                  isBlocked
                    ? "border-border-light bg-[var(--p2-selected,#f0f2f0)] opacity-70"
                    : isPreferred
                      ? "border-amber-300 bg-white ring-1 ring-amber-200"
                      : "border-border-light bg-white"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      isBlocked
                        ? "border-border-default bg-[var(--p2-line2,#e8ebe9)]"
                        : isErledigt
                          ? "border-accent bg-accent text-white"
                          : "border-border-default bg-white"
                    )}
                    aria-hidden
                  >
                    {!isBlocked && isErledigt ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-[14.5px] font-bold leading-snug",
                          isBlocked ? "text-text-secondary" : "text-text-primary"
                        )}
                      >
                        {p.leistung_name}
                      </p>
                      {p.preis_partner != null ? (
                        <p
                          className={cn(
                            "shrink-0 text-[14.5px] font-bold tabular-nums",
                            isBlocked ? "text-text-tertiary" : "text-text-primary"
                          )}
                        >
                          {p.preis_partner.toLocaleString("de-DE", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-text-tertiary">{meta}</p>
                    {inPruefung ? (
                      <p className="mt-1 text-[12.5px] font-semibold text-amber-800">
                        Eingereicht — noch zur Prüfung. Nach Freigabe wie üblich
                        starten und abschließen.
                      </p>
                    ) : null}
                    {!isBlocked && isAufwand && p.zeit_minuten_summe ? (
                      <p className="mt-0.5 text-[12px] text-text-tertiary">
                        Erfasste Zeit: {formatZeitMinuten(p.zeit_minuten_summe)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {!isBlocked && !isErledigt ? (
                  <div className="mt-3 space-y-2">
                    {st === "offen" ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          className="btn-pill-primary flex-1"
                          onClick={() => setSheet({ mode: "start", position: p })}
                        >
                          Start
                        </button>
                        {!isRegie ? (
                          <button
                            type="button"
                            className="btn-pill-outline flex-1"
                            onClick={() =>
                              setSheet({ mode: "erledigt", position: p })
                            }
                          >
                            Erledigt markieren
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {isArbeit ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          className="btn-pill-primary flex-1"
                          onClick={() =>
                            setSheet({ mode: "fortschritt", position: p })
                          }
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="btn-pill-outline flex-1"
                          onClick={() =>
                            setSheet({ mode: "erledigt", position: p })
                          }
                        >
                          Erledigt markieren
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <button
          type="button"
          className="w-full rounded-[10px] border border-dashed px-3 py-3 text-[13.5px] font-semibold text-text-primary"
          style={{ borderColor: PORTAL_VAR.line, background: "#fff" }}
          onClick={() => setNachtragOpen(true)}
        >
          + Nachtrag / Regie
        </button>
        <p className="text-[11.5px] leading-relaxed text-text-tertiary">
          Nachtrag erscheint ausgegraut mit „Noch zur Prüfung“. Nach Freigabe wie
          die übrigen Leistungen starten, abschließen — der Gesamtpreis aktualisiert
          sich automatisch.
        </p>
      </div>

      {sheet ? (
        <PortalModalShell
          open
          title={
            sheet.mode === "erledigt"
              ? "Erledigt"
              : sheet.mode === "fortschritt"
                ? "Update"
                : "Start"
          }
          subtitle={sheet.position.leistung_name}
          onClose={closeSheet}
          variant="edit"
          dirty={
            !submitting &&
            (beschreibung.trim().length > 0 ||
              erledigtFotos.length > 0 ||
              sheet.mode !== "erledigt")
          }
          closeOnBackdrop={!submitting}
          busy={submitting}
          busyTitle={
            sheet.mode === "erledigt"
              ? "Wird abgeschlossen…"
              : "Wird gespeichert…"
          }
          busyBody="Fotos und Daten werden übertragen."
          onConfirm={() => sheetFormRef.current?.requestSubmit()}
          confirmDisabled={submitting}
          confirmLabel={
            sheet.mode === "erledigt"
              ? "Erledigt speichern"
              : sheet.mode === "fortschritt"
                ? "Update speichern"
                : "Start speichern"
          }
        >
          {(() => {
            const sheetIsRegie =
              sheet.position.typ === "regie" ||
              sheet.position.verguetung === "aufwand";
            const fotoPflicht =
              sheetIsRegie &&
              (sheet.mode === "start" || sheet.mode === "erledigt");
            const textPflicht = fotoPflicht;
            const erledigtMulti = sheet.mode === "erledigt" && !sheetIsRegie;
            return (
          <form
            ref={sheetFormRef}
            action={submitSheet}
            className="flex flex-col"
          >
            <input type="hidden" name="positionId" value={sheet.position.id} />
            {anfrageId ? (
              <input type="hidden" name="anfrageId" value={anfrageId} />
            ) : null}

            {sheetIsRegie &&
            (sheet.mode === "start" || sheet.mode === "erledigt") ? (
              <div className="grid grid-cols-2 gap-2.5">
                <PartnerDirektKameraSlot
                  name="foto_start"
                  captureAtName="captureAt_start"
                  label="Start"
                  required={sheet.mode === "start"}
                  compact
                />
                <PartnerDirektKameraSlot
                  name="foto_ende"
                  captureAtName="captureAt_ende"
                  label="Ende"
                  required={sheet.mode === "start" || sheet.mode === "erledigt"}
                  compact
                />
              </div>
            ) : erledigtMulti ? (
              <PartnerMultiFotoSlot
                label="Ergebnis-Foto"
                required={false}
                value={erledigtFotos}
                onChange={setErledigtFotos}
              />
            ) : (
              <PartnerDirektKameraSlot required={false} label="Foto" />
            )}

            <div className="mt-4">
              <PartnerKiKorrekturField
                scope="bautagebuch"
                label="Beschreibung"
                value={beschreibung}
                onChange={setBeschreibung}
                rows={3}
                required={textPflicht}
                leistungName={sheet.position.leistung_name}
                auftragTitel={auftragTitel}
                placeholder="Kurz beschreiben…"
              />
            </div>

            {sheetIsRegie &&
            (sheet.mode === "start" ||
              sheet.mode === "fortschritt" ||
              sheet.mode === "erledigt") ? (
              <div className="mt-3 space-y-1">
                <p className="portal-form-label">
                  {sheet.mode === "erledigt" || sheet.mode === "start"
                    ? "Meine Zeit gesamt"
                    : "Zeitaufwand"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="zeitStd"
                    min={0}
                    step={1}
                    required={sheet.mode === "erledigt" || sheet.mode === "start"}
                    defaultValue={
                      sheet.position.zeit_minuten_summe
                        ? Math.floor(sheet.position.zeit_minuten_summe / 60)
                        : 0
                    }
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="Std"
                  />
                  <input
                    type="number"
                    name="zeitMin"
                    min={0}
                    max={59}
                    step={1}
                    required={sheet.mode === "erledigt" || sheet.mode === "start"}
                    defaultValue={
                      sheet.position.zeit_minuten_summe
                        ? sheet.position.zeit_minuten_summe % 60
                        : 0
                    }
                    className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                    placeholder="Min"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <button
                type="submit"
                className="btn-pill-primary w-full"
                disabled={submitting}
              >
                {submitting
                  ? "Speichern…"
                  : sheet.mode === "erledigt"
                    ? "Erledigt speichern"
                    : sheet.mode === "fortschritt"
                      ? "Update speichern"
                      : "Start speichern"}
              </button>
            </div>
          </form>
            );
          })()}
        </PortalModalShell>
      ) : null}

      <PortalModalShell
        open={nachtragOpen}
        title="Nachtrag / Regie"
        subtitle="Noch nicht ausführen — Bärenwald prüft und weist zu."
        onClose={closeNachtrag}
        variant="edit"
        dirty={
          !submitting &&
          (nachtragTitel.trim().length > 0 ||
            nachtragBegruendung.trim().length > 0 ||
            nachtragEur.trim().length > 0 ||
            nachtragHours > 0 ||
            nachtragMins > 0)
        }
        closeOnBackdrop={!submitting}
        busy={submitting && nachtragOpen}
        busyTitle="Nachtrag wird eingereicht…"
        busyBody="Einen Moment — Bärenwald erhält die Meldung."
        onConfirm={() => submitNachtrag()}
        confirmDisabled={
          submitting ||
          nachtragTitel.trim().length < 4 ||
          nachtragBegruendung.trim().length < 8
        }
        confirmLabel="Zur Prüfung senden"
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
              Titel *
            </span>
            <input
              value={nachtragTitel}
              onChange={(e) => setNachtragTitel(e.target.value)}
              required
              minLength={4}
              placeholder="z. B. Zusätzliche Leitung verlegen"
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
              Begründung *
            </span>
            <textarea
              value={nachtragBegruendung}
              onChange={(e) => setNachtragBegruendung(e.target.value)}
              required
              minLength={8}
              rows={3}
              placeholder="Warum nötig? Was wurde vorgefunden?"
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
                Betrag in €
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={nachtragEur}
                onChange={(e) => setNachtragEur(e.target.value)}
                placeholder="z. B. 180"
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
                Zeit in HH:MM
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={nachtragHours}
                  onChange={(e) => setNachtragHours(Number(e.target.value))}
                  aria-label="Stunden"
                  className="portal-input min-w-0 flex-1 rounded-xl border border-border-default px-2 py-2.5"
                >
                  {Array.from({ length: 49 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-[14px] font-semibold text-text-tertiary">
                  :
                </span>
                <select
                  value={nachtragMins}
                  onChange={(e) => setNachtragMins(Number(e.target.value))}
                  aria-label="Minuten"
                  className="portal-input min-w-0 flex-1 rounded-xl border border-border-default px-2 py-2.5"
                >
                  {Array.from({ length: 60 }, (_, m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-pill-outline portal-btn"
            disabled={submitting}
            onClick={closeNachtrag}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-pill-primary portal-btn"
            disabled={
              submitting ||
              nachtragTitel.trim().length < 4 ||
              nachtragBegruendung.trim().length < 8
            }
            onClick={() => submitNachtrag()}
          >
            {submitting ? "Senden…" : "Zur Prüfung"}
          </button>
        </div>
      </PortalModalShell>
    </div>
  );
}
