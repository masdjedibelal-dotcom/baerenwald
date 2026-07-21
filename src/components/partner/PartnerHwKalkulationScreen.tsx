"use client";

import { useMemo, useState } from "react";

import { submitPartnerHwKalkulation } from "@/app/actions/partner-hw-kalkulation";
import {
  PartnerDetailError,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
import {
  DEFAULT_HW_POSITIONEN,
  formatHwMoney,
  hwKalkAdd,
  hwKalkDel,
  hwKalkPatch,
  hwKalkSumme,
  hwKalkValid,
  type HwKalkPosition,
} from "@/lib/portal2/hw-kalkulation";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  anfrageId: string;
  schwelleEur?: number;
  initialPositionen?: HwKalkPosition[];
  onDone: () => void;
  onCancel: () => void;
};

/**
 * Mock `screenHwKalkulation` — Positionen add/patch/del, Summe 19 %, Einreichen.
 */
export function PartnerHwKalkulationScreen({
  anfrageId,
  schwelleEur = 500,
  initialPositionen,
  onDone,
  onCancel,
}: Props) {
  const [modus, setModus] = useState<"kalkulieren" | "upload">("kalkulieren");
  const [positionen, setPositionen] = useState<HwKalkPosition[]>(
    () =>
      initialPositionen?.length
        ? initialPositionen.map((p) => ({ ...p }))
        : DEFAULT_HW_POSITIONEN.map((p) => ({ ...p }))
  );
  const [dauer, setDauer] = useState("2–3 Werktage");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sum = useMemo(() => hwKalkSumme(positionen), [positionen]);
  const unterSchwelle = sum.brutto <= schwelleEur;
  const canSubmit = hwKalkValid(positionen);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const res = await submitPartnerHwKalkulation({
      anfrageId,
      positionen:
        modus === "upload" ? DEFAULT_HW_POSITIONEN : positionen,
      dauerHinweis: dauer,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      portalToastError("Kalkulation fehlgeschlagen", res.error);
      return;
    }
    partnerPortalToast.hwAngebotEingereicht();
    onDone();
  }

  return (
    <PartnerDetailSection title="Kalkulation / Angebot">
      <p className="portal-text-body text-text-secondary mb-3">
        Positionen anlegen, Summen prüfen und einreichen. Das Angebot erscheint
        im CRM und bei der Hausverwaltung als empfohlenes Angebot.
      </p>

      <div className="mb-3 flex rounded-[10px] bg-muted p-1">
        {(
          [
            ["kalkulieren", "Kalkulieren"],
            ["upload", "PDF-Upload (Standard)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={cn(
              "flex-1 rounded-lg py-2 text-[13px] font-semibold",
              modus === key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary"
            )}
            onClick={() => setModus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {modus === "kalkulieren" ? (
        <div className="space-y-0 overflow-hidden rounded-xl border border-border-default bg-white">
          {positionen.map((p, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 border-b border-border-light px-3 py-2.5 last:border-b-0"
            >
              <input
                className="portal-input min-w-0 flex-1 rounded-lg border border-border-default px-2.5 py-2 text-sm"
                placeholder="Leistung / Position"
                value={p.pos}
                onChange={(e) =>
                  setPositionen(hwKalkPatch(positionen, i, "pos", e.target.value))
                }
              />
              <input
                className="portal-input w-[74px] rounded-lg border border-border-default px-2 py-2 text-center text-sm"
                value={p.menge}
                onChange={(e) =>
                  setPositionen(
                    hwKalkPatch(positionen, i, "menge", e.target.value)
                  )
                }
              />
              <div className="relative">
                <input
                  type="number"
                  className="portal-input w-[92px] rounded-lg border border-border-default py-2 pl-2 pr-6 text-right text-sm"
                  value={p.einzel}
                  onChange={(e) =>
                    setPositionen(
                      hwKalkPatch(positionen, i, "einzel", e.target.value)
                    )
                  }
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                  €
                </span>
              </div>
              <button
                type="button"
                className="px-1 text-lg text-text-tertiary"
                title="Position entfernen"
                onClick={() => setPositionen(hwKalkDel(positionen, i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border-default p-4 text-sm text-text-secondary">
          PDF-Upload nutzt die Standard-Positionen als Angebotsbasis. Für
          detaillierte Kalkulation den Modus „Kalkulieren“ wählen. Angebot-PDF
          können Sie nach Einreichung unter Unterlagen nachreichen.
        </p>
      )}

      {modus === "kalkulieren" ? (
        <button
          type="button"
          className="mt-2 text-[13px] font-semibold text-accent"
          onClick={() => setPositionen(hwKalkAdd(positionen))}
        >
          ＋ Position hinzufügen
        </button>
      ) : null}

      <label className="mt-4 block">
        <span className="portal-text-meta text-text-tertiary">
          Voraussichtliche Dauer
        </span>
        <input
          className="portal-input mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm"
          value={dauer}
          onChange={(e) => setDauer(e.target.value)}
        />
      </label>

      <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span>Netto</span>
          <span className="font-semibold">{formatHwMoney(sum.net)}</span>
        </div>
        <div className="mt-1 flex justify-between text-text-secondary">
          <span>MwSt 19 %</span>
          <span>{formatHwMoney(sum.mwst)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border-default pt-2 text-base font-bold">
          <span>Brutto</span>
          <span>{formatHwMoney(sum.brutto)}</span>
        </div>
        {unterSchwelle ? (
          <p className="mt-2 text-xs font-semibold text-[#1F6A3F]">
            ✓ Unter Freigabeschwelle ({formatHwMoney(schwelleEur)}) — Sie können
            die Durchführung direkt starten, ohne Freigabe der Hausverwaltung.
          </p>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">
            Über Freigabeschwelle — die Hausverwaltung muss das Angebot erst
            freigeben.
          </p>
        )}
      </div>

      {error ? <PartnerDetailError message={error} /> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-pill-primary"
          disabled={busy || !canSubmit}
          onClick={() => void onSubmit()}
        >
          {busy ? "Wird eingereicht…" : "Angebot einreichen"}
        </button>
        <button
          type="button"
          className="btn-pill-outline"
          disabled={busy}
          onClick={onCancel}
        >
          Abbrechen
        </button>
      </div>
    </PartnerDetailSection>
  );
}
