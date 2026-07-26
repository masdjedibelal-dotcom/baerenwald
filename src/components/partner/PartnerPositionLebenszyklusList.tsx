"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Play, X } from "lucide-react";

import { PartnerDirektKameraSlot } from "@/components/partner/PartnerDirektKameraSlot";
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
import { PORTAL_MODAL_SCRIM } from "@/lib/portal2/modal-shell";
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
}: Props) {
  const [sheet, setSheet] = useState<{
    mode: SheetMode;
    position: LebenszyklusPosition;
  } | null>(null);
  const [weitereOpen, setWeitereOpen] = useState(false);
  const [weitereTitel, setWeitereTitel] = useState("");
  const [pending, startTransition] = useTransition();
  const [nachreich, setNachreich] = useState(false);

  const erledigtCount = useMemo(
    () => positionen.filter((p) => p.leistung_status === "erledigt").length,
    [positionen]
  );
  const progressPct =
    positionen.length > 0
      ? Math.round((erledigtCount / positionen.length) * 100)
      : 0;

  function submitSheet(formData: FormData) {
    if (!sheet?.mode) return;
    if (nachreich) {
      formData.set("nachgereicht", "1");
    }
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
            {erledigtCount} von {positionen.length} erledigt
          </p>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
          style={{ background: PORTAL_VAR.line2 }}
          role="progressbar"
          aria-valuenow={erledigtCount}
          aria-valuemin={0}
          aria-valuemax={positionen.length}
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

      {positionen.length === 0 ? (
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
          {positionen.map((p) => {
            const st = p.leistung_status ?? "offen";
            const isArbeit = st === "in_arbeit";
            const isErledigt = st === "erledigt";
            const isAufwand = p.verguetung === "aufwand";
            const isRegie = p.typ === "regie" || isAufwand;
            const meta = [
              lebenszyklusLabel(st),
              mengeLabel(p),
              p.anerkennung_status === "in_pruefung" ? "in Prüfung" : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={p.id}
                className="rounded-xl border border-border-light bg-white px-3.5 py-3.5 shadow-[0_1px_2px_rgba(22,32,27,0.04)]"
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
                    ) : null}
                    {st === "offen" ? (
                      <button
                        type="button"
                        className="btn-pill-primary flex w-full items-center justify-center gap-2"
                        onClick={() => setSheet({ mode: "start", position: p })}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                        Start — Ankunftsfoto
                      </button>
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
                          Ende — Dokumentieren
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          style={{ background: PORTAL_MODAL_SCRIM }}
          role="presentation"
          onClick={closeSheet}
        >
          <form
            action={submitSheet}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border-light px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[17px] font-bold text-text-primary">
                  {sheet.mode === "start"
                    ? "Position starten"
                    : sheet.mode === "fortschritt"
                      ? "Fortschritt festhalten"
                      : "Position abschließen"}
                </p>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  {sheet.position.leistung_name}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-text-tertiary hover:bg-muted"
                onClick={closeSheet}
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <input type="hidden" name="positionId" value={sheet.position.id} />

              {!nachreich ? (
                <PartnerDirektKameraSlot
                  label={
                    sheet.mode === "start"
                      ? "Ankunftsfoto — Ort & Zustand"
                      : sheet.mode === "fortschritt"
                        ? "Fortschritts-Foto"
                        : "Ergebnis-Foto — fertige Arbeit"
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
                    required
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

              <label className="mt-4 block space-y-1.5">
                <span className="text-[14px] font-bold text-text-primary">
                  {sheet.mode === "start"
                    ? "Ausgangslage"
                    : sheet.mode === "fortschritt"
                      ? "Kurz beschreiben"
                      : "Ergebnis / Schlussbemerkung"}
                  {sheet.mode !== "fortschritt" ? (
                    <span className="font-semibold text-red-700"> · Pflicht</span>
                  ) : null}
                </span>
                <textarea
                  name="beschreibung"
                  rows={3}
                  required={sheet.mode !== "fortschritt"}
                  className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                  placeholder={
                    sheet.mode === "start"
                      ? "z.B. Leck an Steigleitung, Wand feucht"
                      : sheet.mode === "fortschritt"
                        ? "z.B. Estrich eingebracht, trocknet"
                        : "Was wurde fertiggestellt?"
                  }
                />
              </label>

              {sheet.mode === "start" ? (
                <p
                  className="mt-3 rounded-[11px] px-3.5 py-3 text-[13px] leading-relaxed"
                  style={{
                    background: PORTAL_VAR.primarySoft,
                    color: PORTAL_VAR.sub,
                  }}
                >
                  Nur mit Start-Foto wird die Position freigeschaltet. Danach
                  kannst du Fortschritte festhalten und die Arbeit abschließen.
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
            </div>

            <div className="border-t border-border-light px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
        </div>
      ) : null}

      <PortalModalShell
        open={weitereOpen}
        title="Weitere Arbeit"
        subtitle="Neue Regie-Position nach Aufwand — in Prüfung bis CRM anerkennt."
        onClose={closeWeitere}
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
