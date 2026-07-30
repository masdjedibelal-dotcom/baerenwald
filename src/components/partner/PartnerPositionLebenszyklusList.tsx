"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Play } from "lucide-react";

import { PartnerDirektKameraSlot } from "@/components/partner/PartnerDirektKameraSlot";
import { PartnerKiKorrekturField } from "@/components/partner/PartnerKiKorrekturField";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  addPartnerPositionFortschritt,
  completePartnerPosition,
  createPartnerWeitereArbeit,
  startPartnerPosition,
} from "@/app/actions/partner-position-eintraege";
import {
  formatZeitMinuten,
  lebenszyklusLabel,
} from "@/lib/partner/position-lebenszyklus";
import { HW_DOKU_STORY } from "@/lib/portal2/hw-doku-story";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
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
  onDone?: () => void;
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
  const [weitereOpen, setWeitereOpen] = useState(false);
  const [weitereTitel, setWeitereTitel] = useState("");
  const [pending, startTransition] = useTransition();
  const [nachreich, setNachreich] = useState(false);
  const [beschreibung, setBeschreibung] = useState("");
  const autoOpenedRef = useRef(false);
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

  const erledigtCount = useMemo(
    () => sortedPositionen.filter((p) => p.leistung_status === "erledigt").length,
    [sortedPositionen]
  );
  const progressPct =
    sortedPositionen.length > 0
      ? Math.round((erledigtCount / sortedPositionen.length) * 100)
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
  }, [sheet?.position.id, sheet?.mode]);

  function submitSheet(formData: FormData) {
    if (!sheet?.mode) return;
    if (nachreich) {
      formData.set("nachgereicht", "1");
    }
    if (anfrageId) formData.set("anfrageId", anfrageId);
    startTransition(async () => {
      const action =
        sheet.mode === "start"
          ? startPartnerPosition
          : sheet.mode === "fortschritt"
            ? addPartnerPositionFortschritt
            : completePartnerPosition;
      const res = await action(formData);
      if (!res.ok) {
        portalToastError(res.error);
        return;
      }
      portalToastSuccess(
        sheet.mode === "start"
          ? "Position gestartet."
          : sheet.mode === "fortschritt"
            ? "Fortschritt gespeichert."
            : HW_DOKU_STORY.positionEndeToast
      );
      setSheet(null);
      setNachreich(false);
      setBeschreibung("");
      onDone?.();
    });
  }

  function submitWeitere() {
    const titel = weitereTitel.trim();
    if (titel.length < 4) {
      portalToastError("Bitte kurz beschreiben (mind. 4 Zeichen).");
      return;
    }
    const formData = new FormData();
    formData.set("auftragId", auftragId);
    formData.set("titel", titel);
    startTransition(async () => {
      const res = await createPartnerWeitereArbeit(formData);
      if (!res.ok) {
        portalToastError(res.error);
        return;
      }
      portalToastSuccess("Weitere Arbeit angelegt — in Prüfung.");
      setWeitereOpen(false);
      setWeitereTitel("");
      onDone?.();
    });
  }

  function closeWeitere() {
    if (pending) return;
    setWeitereOpen(false);
    setWeitereTitel("");
  }

  function closeSheet() {
    if (pending) return;
    setSheet(null);
    setNachreich(false);
    setBeschreibung("");
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
          Leistungen
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold" style={{ color: PORTAL_VAR.sub }}>
            Fortschritt
          </p>
          <p className="text-[12.5px] font-semibold" style={{ color: PORTAL_VAR.sub }}>
            {erledigtCount} von {sortedPositionen.length} erledigt
          </p>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
          style={{ background: PORTAL_VAR.line2 }}
          role="progressbar"
          aria-valuenow={erledigtCount}
          aria-valuemin={0}
          aria-valuemax={sortedPositionen.length}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: PORTAL_VAR.primary,
            }}
          />
        </div>
      </div>

      {sortedPositionen.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-4 py-5 text-center"
          style={{ borderColor: PORTAL_VAR.line }}
          data-testid="hw-first-job-empty"
        >
          <p className="text-[14px] font-bold" style={{ color: PORTAL_VAR.ink }}>
            {HW_DOKU_STORY.firstJobTitle}
          </p>
          <p className="mt-1.5 text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
            Noch keine Leistung. Legen Sie weitere Arbeit an oder warten Sie auf
            die Beauftragung.
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
            const meta = [
              lebenszyklusLabel(st),
              mengeLabel(p),
              p.anerkennung_status === "in_pruefung" ? "in Prüfung" : null,
              isPreferred ? "Update angefordert" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={p.id}
                className={cn(
                  "rounded-xl border bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]",
                  isPreferred
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-border-light"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      isErledigt
                        ? "border-accent bg-accent text-white"
                        : "border-border-default bg-white"
                    )}
                    aria-hidden
                  >
                    {isErledigt ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14.5px] font-bold leading-snug text-text-primary">
                        {p.leistung_name}
                      </p>
                      {p.preis_partner != null ? (
                        <p className="shrink-0 text-[14.5px] font-bold tabular-nums text-text-primary">
                          {p.preis_partner.toLocaleString("de-DE", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-text-tertiary">{meta}</p>
                    {isAufwand && p.zeit_minuten_summe ? (
                      <p className="mt-0.5 text-[12px] text-text-tertiary">
                        Erfasste Zeit: {formatZeitMinuten(p.zeit_minuten_summe)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {!isErledigt ? (
                  <div className="mt-3 space-y-2">
                    {isRegie ? (
                      <p className="text-[11.5px] leading-relaxed text-text-tertiary">
                        {HW_DOKU_STORY.regieHint}
                      </p>
                    ) : (
                      <p className="text-[11.5px] leading-relaxed text-text-tertiary">
                        {HW_DOKU_STORY.lvHint}
                      </p>
                    )}
                    {st === "offen" ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          className="btn-pill-primary flex flex-1 items-center justify-center gap-2"
                          onClick={() => setSheet({ mode: "start", position: p })}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                          {isRegie ? "Start — Ankunftsfoto" : "Start"}
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
                          className="btn-pill-outline flex-1"
                          onClick={() =>
                            setSheet({ mode: "fortschritt", position: p })
                          }
                        >
                          Fortschritt
                        </button>
                        <button
                          type="button"
                          className="btn-pill-primary flex-1"
                          onClick={() =>
                            setSheet({ mode: "erledigt", position: p })
                          }
                        >
                          {isRegie ? "Ende — Dokumentieren" : "Erledigt"}
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

      <div>
        <button
          type="button"
          className="w-full rounded-[10px] border border-dashed px-3 py-3 text-[13.5px] font-semibold"
          style={{
            borderColor: PORTAL_VAR.primary,
            background: PORTAL_VAR.primarySoft,
            color: PORTAL_VAR.primary,
          }}
          onClick={() => setWeitereOpen(true)}
        >
          + Weitere Arbeit
        </button>
        <p className="mt-2 text-[11.5px] leading-relaxed text-text-tertiary">
          Kleinere Zusatzarbeiten (bis ca. 30 Min) direkt dokumentieren —
          größere bitte vor Ausführung als Nachtrag melden.
        </p>
      </div>

      {sheet ? (
        <PortalModalShell
          open
          title={
            sheet.mode === "start"
              ? "Position starten"
              : sheet.mode === "fortschritt"
                ? "Fortschritt festhalten"
                : "Position abschließen"
          }
          subtitle={sheet.position.leistung_name}
          onClose={closeSheet}
          variant="edit"
          dirty
          closeOnBackdrop={!pending}
        >
          {(() => {
            const sheetIsRegie =
              sheet.position.typ === "regie" ||
              sheet.position.verguetung === "aufwand";
            const fotoPflicht =
              sheetIsRegie &&
              (sheet.mode === "start" || sheet.mode === "erledigt");
            const textPflicht = fotoPflicht;
            return (
          <form action={submitSheet} className="flex flex-col">
            <input type="hidden" name="positionId" value={sheet.position.id} />
            {anfrageId ? (
              <input type="hidden" name="anfrageId" value={anfrageId} />
            ) : null}

            {!nachreich ? (
              <PartnerDirektKameraSlot
                required={fotoPflicht}
                label={
                  sheet.mode === "start"
                    ? sheetIsRegie
                      ? "Ankunftsfoto — Ort & Zustand"
                      : "Ankunftsfoto (optional)"
                    : sheet.mode === "fortschritt"
                      ? "Fortschritts-Foto (optional)"
                      : sheetIsRegie
                        ? "Ergebnis-Foto — fertige Arbeit"
                        : "Ergebnis-Foto (optional)"
                }
              />
            ) : null}

            <button
              type="button"
              className="mt-2 text-xs text-text-tertiary underline"
              onClick={() => setNachreich((v) => !v)}
            >
              {nachreich ? "Kamera nutzen" : "Foto liegt schon vor?"}
            </button>
            {nachreich ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-800">
                  Galerie erlaubt — zählt als nachgereicht, nicht für
                  Tagesspanne.
                </p>
                <input
                  type="file"
                  name="foto"
                  accept="image/*"
                  required={fotoPflicht}
                  className="block w-full text-sm"
                />
                <input
                  type="text"
                  name="nachreichGrund"
                  required
                  placeholder="Grund (Pflicht)"
                  className="input-field w-full"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <PartnerKiKorrekturField
                scope="bautagebuch"
                label={
                  sheet.mode === "start"
                    ? "Ausgangslage"
                    : sheet.mode === "fortschritt"
                      ? "Kurz beschreiben"
                      : "Ergebnis / Schlussbemerkung"
                }
                value={beschreibung}
                onChange={setBeschreibung}
                rows={3}
                required={textPflicht}
                leistungName={sheet.position.leistung_name}
                auftragTitel={auftragTitel}
                placeholder={
                  sheet.mode === "start"
                    ? "Einsprechen oder tippen — KI formuliert kundenfertig"
                    : sheet.mode === "fortschritt"
                      ? "z.B. Estrich eingebracht, trocknet"
                      : "Was wurde fertiggestellt?"
                }
              />
            </div>

            {sheet.mode === "start" && sheetIsRegie ? (
              <p
                className="mt-3 rounded-[11px] px-3.5 py-3 text-[13px] leading-relaxed"
                style={{
                  background: PORTAL_VAR.primarySoft,
                  color: PORTAL_VAR.sub,
                }}
              >
                Bei Regie sind Ankunftsfoto und kurze Ausgangslage Pflicht.
                Danach Fortschritte und Ende mit Ergebnis-Foto.
              </p>
            ) : null}

            {sheet.position.verguetung === "aufwand" &&
            (sheet.mode === "fortschritt" || sheet.mode === "erledigt") ? (
              <div className="mt-3 space-y-1">
                <p className="portal-form-label">
                  {sheet.mode === "erledigt"
                    ? "Meine Zeit gesamt (Pflicht bei Regie)"
                    : "Zeitaufwand (Regie)"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="zeitStd"
                    min={0}
                    step={1}
                    required={sheet.mode === "erledigt"}
                    defaultValue={
                      sheet.mode === "erledigt" &&
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
                    required={sheet.mode === "erledigt"}
                    defaultValue={
                      sheet.mode === "erledigt" &&
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
                disabled={pending}
              >
                {pending
                  ? "Speichern…"
                  : sheet.mode === "start"
                    ? "Position starten"
                    : sheet.mode === "fortschritt"
                      ? "Fortschritt speichern"
                      : "Dokumentieren"}
              </button>
            </div>
          </form>
            );
          })()}
        </PortalModalShell>
      ) : null}

      <PortalModalShell
        open={weitereOpen}
        title="Weitere Arbeit"
        subtitle="Neue Regie-Position nach Aufwand — in Prüfung bis CRM anerkennt."
        onClose={closeWeitere}
        variant="edit"
        dirty={weitereTitel.trim().length > 0}
        closeOnBackdrop={!pending}
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
            Was wurde zusätzlich gemacht?
          </span>
          <input
            value={weitereTitel}
            onChange={(e) => setWeitereTitel(e.target.value)}
            required
            minLength={4}
            placeholder="Kurz beschreiben…"
            className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
            autoFocus
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
            disabled={pending}
            onClick={closeWeitere}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-pill-primary portal-btn !px-4 !py-2.5"
            disabled={pending || weitereTitel.trim().length < 4}
            onClick={() => submitWeitere()}
          >
            {pending ? "Anlegen…" : "Speichern"}
          </button>
        </div>
      </PortalModalShell>
    </div>
  );
}
