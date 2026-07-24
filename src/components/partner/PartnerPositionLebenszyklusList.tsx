"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { PartnerDirektKameraSlot } from "@/components/partner/PartnerDirektKameraSlot";
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
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";
import { PORTAL_MODAL_SCRIM } from "@/lib/portal2/modal-shell";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

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

type SheetMode = "start" | "fortschritt" | "erledigt" | null;

type Props = {
  auftragId: string;
  positionen: LebenszyklusPosition[];
  onDone?: () => void;
};

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
  const [pending, startTransition] = useTransition();
  const [nachreich, setNachreich] = useState(false);

  const erledigtCount = useMemo(
    () => positionen.filter((p) => p.leistung_status === "erledigt").length,
    [positionen]
  );

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

  function submitWeitere(formData: FormData) {
    formData.set("auftragId", auftragId);
    startTransition(async () => {
      const res = await createPartnerWeitereArbeit(formData);
      if (!res.ok) {
        portalToastError(res.error);
        return;
      }
      portalToastSuccess("Weitere Arbeit angelegt — in Prüfung.");
      setWeitereOpen(false);
      onDone?.();
    });
  }

  return (
    <section className="space-y-3 border-t border-border-light pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="portal-text-label text-text-tertiary">
          {HW_DOKU_STORY.title}
        </h4>
        <p className="text-xs text-text-tertiary">
          {erledigtCount} von {positionen.length} erledigt
        </p>
      </div>

      <p className="text-[12.5px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
        {HW_DOKU_STORY.lead}
      </p>

      <ol className="grid gap-2 sm:grid-cols-3">
        {HW_DOKU_STORY.steps.map((s) => (
          <li
            key={s.n}
            className="rounded-lg px-3 py-2.5"
            style={{ background: "#F6F7F6" }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: PORTAL_VAR.faint }}
            >
              {s.n}. {s.title}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: PORTAL_VAR.sub }}>
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      {positionen.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-4 py-5 text-center"
          style={{ borderColor: PORTAL_VAR.line }}
          data-testid="hw-first-job-empty"
        >
          <p
            className="text-[14px] font-bold"
            style={{ color: PORTAL_VAR.ink }}
          >
            {HW_DOKU_STORY.firstJobTitle}
          </p>
          <p className="mt-1.5 text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
            {HW_DOKU_STORY.firstJobEmpty}
          </p>
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {positionen.map((p) => {
          const st = p.leistung_status ?? "offen";
          const isArbeit = st === "in_arbeit";
          const isErledigt = st === "erledigt";
          const isAufwand = p.verguetung === "aufwand";
          const isRegie = p.typ === "regie" || isAufwand;
          const meta = [
            lebenszyklusLabel(st),
            p.einheit && p.menge != null
              ? `${p.menge} ${p.einheit}`
              : null,
            p.anerkennung_status === "in_pruefung" ? "in Prüfung" : null,
            isRegie ? "Regie/Aufwand" : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={p.id}
              className={cn(
                "rounded-xl border bg-white p-3.5",
                isArbeit
                  ? "border-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
                  : "border-border-light"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="portal-text-card-title">{p.leistung_name}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{meta}</p>
                </div>
                {p.preis_partner != null ? (
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {p.preis_partner.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                ) : null}
              </div>

              {!isErledigt ? (
                <div className="mt-3 flex flex-col gap-2">
                  {isRegie ? (
                    <p
                      className="rounded-lg px-2.5 py-2 text-[11.5px] font-medium"
                      style={{ background: "#FBF1D6", color: "#8A5A06" }}
                    >
                      {HW_DOKU_STORY.regieHint}
                    </p>
                  ) : null}
                  {st === "offen" ? (
                    <button
                      type="button"
                      className="btn-pill-primary w-full"
                      onClick={() => setSheet({ mode: "start", position: p })}
                    >
                      ▶ 1. Start — Ankunftsfoto
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
                        2. Fortschritt
                      </button>
                      <button
                        type="button"
                        className="btn-pill-primary flex-1"
                        onClick={() =>
                          setSheet({ mode: "erledigt", position: p })
                        }
                      >
                        3. Ende — Dokumentieren
                      </button>
                    </div>
                  ) : null}
                  {isAufwand && p.zeit_minuten_summe ? (
                    <p className="text-xs text-text-tertiary">
                      Erfasste Zeit: {formatZeitMinuten(p.zeit_minuten_summe)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="btn-pill-outline w-full"
        onClick={() => setWeitereOpen(true)}
      >
        + Weitere Arbeit
      </button>
      <p className="text-[11px] leading-relaxed text-text-tertiary">
        Bis ca. 30 Min direkt dokumentieren; größere Arbeiten vorher als
        Nachtrag melden. Neue Positionen stehen „in Prüfung“.
      </p>

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ background: PORTAL_MODAL_SCRIM }}>
          <form
            action={submitSheet}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="portal-text-section">
                  {sheet.mode === "start"
                    ? "Position starten"
                    : sheet.mode === "fortschritt"
                      ? "Fortschritt festhalten"
                      : "Position abschließen"}
                </p>
                <p className="text-sm text-text-secondary">
                  {sheet.position.leistung_name}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-text-tertiary hover:bg-muted"
                onClick={() => {
                  setSheet(null);
                  setNachreich(false);
                }}
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input type="hidden" name="positionId" value={sheet.position.id} />

            <PartnerDirektKameraSlot
              label={
                sheet.mode === "start"
                  ? "Ankunftsfoto — Ort & Zustand"
                  : sheet.mode === "fortschritt"
                    ? "Fortschritts-Foto"
                    : "Ergebnis-Foto — fertige Arbeit"
              }
            />

            <button
              type="button"
              className="mt-2 text-xs text-text-tertiary underline"
              onClick={() => setNachreich((v) => !v)}
            >
              Foto liegt schon vor?
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

            <label className="mt-4 block space-y-1">
              <span className="portal-form-label">
                {sheet.mode === "start"
                  ? "Ausgangslage"
                  : sheet.mode === "fortschritt"
                    ? "Kurz beschreiben"
                    : "Ergebnis / Schlussbemerkung"}
              </span>
              <textarea
                name="beschreibung"
                rows={3}
                className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
                placeholder={
                  sheet.mode === "start"
                    ? "z.B. Leck an Steigleitung, Wand feucht"
                    : sheet.mode === "fortschritt"
                      ? "z.B. Estrich eingebracht, trocknet"
                      : "Was wurde fertiggestellt?"
                }
              />
              <span className="text-[11px] text-text-tertiary">
                Tipp: Mikrofon der Tastatur nutzen und einfach sprechen.
              </span>
            </label>

            {sheet.position.verguetung === "aufwand" &&
            (sheet.mode === "fortschritt" || sheet.mode === "erledigt") ? (
              <div className="mt-3 space-y-1">
                <p className="portal-form-label">
                  {sheet.mode === "erledigt"
                    ? "Meine Zeit gesamt (Pflicht bei Regie)"
                    : "Zeitaufwand (Regie)"}
                </p>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Stunden</span>
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
                  </label>
                  <label className="flex-1">
                    <span className="sr-only">Minuten</span>
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
                  </label>
                </div>
                <p className="text-[11px] text-amber-800">
                  Soft-Gate: Ohne Zeitnachweis bleibt die Regie-Position unvollständig.
                </p>
              </div>
            ) : null}

            {sheet.mode === "start" ? (
              <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-text-secondary">
                Nur mit Start-Foto wird die Position freigeschaltet. Danach
                kannst du Fortschritte festhalten und die Arbeit abschließen.
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-pill-primary mt-4 w-full"
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
          </form>
        </div>
      ) : null}

      {weitereOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          style={{ background: PORTAL_MODAL_SCRIM }}>
          <form
            action={submitWeitere}
            className="w-full max-w-lg rounded-t-2xl bg-white p-4 sm:rounded-2xl"
          >
            <p className="portal-text-section">Weitere Arbeit</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Neue Regie-Position nach Aufwand — in Prüfung bis CRM anerkennt.
            </p>
            <input
              name="titel"
              required
              minLength={4}
              placeholder="Was wurde zusätzlich gemacht?"
              className="portal-input mt-3 w-full rounded-xl border border-border-default px-3 py-2.5"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-pill-outline flex-1"
                onClick={() => setWeitereOpen(false)}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn-pill-primary flex-1"
                disabled={pending}
              >
                Anlegen
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
