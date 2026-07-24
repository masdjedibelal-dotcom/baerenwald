"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, X } from "lucide-react";

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
  /** Ohne eigene Section-Chrome — eingebettet in Leistungen & Vergütung. */
  embedded?: boolean;
};

export function PartnerPositionLebenszyklusList({
  auftragId,
  positionen,
  onDone,
  embedded = false,
}: Props) {
  const [sheet, setSheet] = useState<{
    mode: SheetMode;
    position: LebenszyklusPosition;
  } | null>(null);
  const [weitereOpen, setWeitereOpen] = useState(false);
  const [weitereTitel, setWeitereTitel] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nachreich, setNachreich] = useState(false);

  const erledigtCount = useMemo(
    () => positionen.filter((p) => p.leistung_status === "erledigt").length,
    [positionen]
  );
  const firstArbeitId = useMemo(
    () =>
      positionen.find((p) => p.leistung_status === "in_arbeit")?.id ?? null,
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

  const list = (
    <>
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
            Noch keine Leistung. Tippen Sie eine Position an, um Startfoto und
            Dokumentation zu beginnen.
          </p>
        </div>
      ) : null}

      {positionen.length > 0 ? (
        <p className="text-[12px]" style={{ color: PORTAL_VAR.faint }}>
          {erledigtCount} von {positionen.length} dokumentiert · Tippen zum
          Öffnen
        </p>
      ) : null}

      <ul className="space-y-2">
        {positionen.map((p) => {
          const st = p.leistung_status ?? "offen";
          const isArbeit = st === "in_arbeit";
          const isErledigt = st === "erledigt";
          const isAufwand = p.verguetung === "aufwand";
          const isRegie = p.typ === "regie" || isAufwand;
          const open =
            expandedId === p.id ||
            (expandedId === null && p.id === firstArbeitId);
          const meta = [
            lebenszyklusLabel(st),
            p.einheit && p.menge != null ? `${p.menge} ${p.einheit}` : null,
            p.anerkennung_status === "in_pruefung" ? "in Prüfung" : null,
            isRegie ? "Regie/Aufwand" : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={p.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-white",
                open ? "border-[var(--p2-line)]" : "border-border-light"
              )}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 px-3.5 py-3 text-left"
                onClick={() =>
                  setExpandedId((cur) => (cur === p.id ? null : p.id))
                }
                aria-expanded={open}
              >
                <div className="min-w-0">
                  <p className="portal-text-card-title">{p.leistung_name}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{meta}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.preis_partner != null ? (
                    <p className="text-sm font-semibold tabular-nums">
                      {p.preis_partner.toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-text-tertiary transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </div>
              </button>

              {open ? (
                <div
                  className="space-y-2 border-t px-3.5 py-3"
                  style={{ borderColor: PORTAL_VAR.line2 }}
                >
                  {!isErledigt ? (
                    <>
                      {isRegie ? (
                        <p
                          className="rounded-lg px-2.5 py-2 text-[11.5px] font-medium"
                          style={{ background: "#F6F7F6", color: PORTAL_VAR.sub }}
                        >
                          {HW_DOKU_STORY.regieHint}
                        </p>
                      ) : null}
                      {st === "offen" ? (
                        <button
                          type="button"
                          className="btn-pill-primary w-full"
                          onClick={() =>
                            setSheet({ mode: "start", position: p })
                          }
                        >
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
                      {isAufwand && p.zeit_minuten_summe ? (
                        <p className="text-xs text-text-tertiary">
                          Erfasste Zeit: {formatZeitMinuten(p.zeit_minuten_summe)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
                      Dokumentiert
                      {isAufwand && p.zeit_minuten_summe
                        ? ` · ${formatZeitMinuten(p.zeit_minuten_summe)}`
                        : ""}
                    </p>
                  )}
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
    </>
  );

  return (
    <div className={embedded ? "space-y-3" : "space-y-3 border-t border-border-light pt-5"}>
      {!embedded ? (
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="portal-text-label text-text-tertiary">Leistungen</h4>
          <p className="text-xs text-text-tertiary">
            {erledigtCount} von {positionen.length} erledigt
          </p>
        </div>
      ) : null}

      {list}

      {sheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ background: PORTAL_MODAL_SCRIM }}
          role="presentation"
          onClick={() => {
            if (!pending) {
              setSheet(null);
              setNachreich(false);
            }
          }}
        >
          <form
            action={submitSheet}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border-light px-4 py-3">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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

            <div className="border-t border-border-light px-4 py-3">
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
