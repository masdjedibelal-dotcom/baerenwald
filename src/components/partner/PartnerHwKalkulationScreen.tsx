"use client";

import { useMemo, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import { PortalInput, PortalSelect } from "@/components/shared/PortalFormControls";
import { submitPartnerHwKalkulation } from "@/app/actions/partner-hw-kalkulation";
import {
  PartnerDetailError,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import {
  DEFAULT_HW_POSITIONEN,
  HW_MENGE_EINHEITEN,
  formatHwMoney,
  hwKalkAdd,
  hwKalkDel,
  hwKalkPatch,
  hwKalkSumme,
  hwKalkValid,
  joinHwMenge,
  splitHwMenge,
  type HwKalkPosition,
} from "@/lib/portal2/hw-kalkulation";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";
import { TOAST } from '@/lib/portal-copy'

type Props = {
  anfrageId: string;
  schwelleEur?: number;
  initialPositionen?: HwKalkPosition[];
  onDone: () => void;
  onCancel: () => void;
  /** Partner-Einholung ohne LV: Positionen + Summen, ohne HV-Hilfstexte. */
  variant?: "default" | "einholung";
};

function parseDecimalInput(raw: string): number {
  const n = Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Mock `screenHwKalkulation` — Positionen add/patch/del, Summe 19 %, Einreichen.
 */
export function PartnerHwKalkulationScreen({
  anfrageId,
  schwelleEur = 500,
  initialPositionen,
  onDone,
  onCancel,
  variant = "default",
}: Props) {
  const einholung = variant === "einholung";
  const [modus, setModus] = useState<"kalkulieren" | "upload">("kalkulieren");
  const [positionen, setPositionen] = useState<HwKalkPosition[]>(
    () =>
      initialPositionen?.length
        ? initialPositionen.map((p) => ({ ...p }))
        : einholung
          ? [{ pos: "", menge: "1 Stk.", einzel: 0, gewerk: "Sonstiges" }]
          : DEFAULT_HW_POSITIONEN.map((p) => ({ ...p }))
  );
  const [dauer, setDauer] = useState("2–3 Werktage");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMenge, setDraftMenge] = useState<Record<number, string>>({});
  const [draftEinzel, setDraftEinzel] = useState<Record<number, string>>({});

  const sum = useMemo(() => hwKalkSumme(positionen), [positionen]);
  const unterSchwelle = sum.brutto <= schwelleEur;
  const canSubmit = hwKalkValid(positionen);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await submitPartnerHwKalkulation({
        anfrageId,
        positionen: modus === "upload" ? DEFAULT_HW_POSITIONEN : positionen,
        dauerHinweis: dauer,
      });
      if (!res.ok) {
        setError(res.error);
        portalToastError(TOAST.kalkulation_fehlgeschlagen, res.error);
        return;
      }
      partnerPortalToast.hwAngebotEingereicht();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  function mengeDisplay(i: number, faktor: string) {
    if (draftMenge[i] !== undefined) return draftMenge[i];
    return faktor === "0" || faktor === "0," ? "" : faktor;
  }

  function einzelDisplay(i: number, einzel: number) {
    if (draftEinzel[i] !== undefined) return draftEinzel[i];
    return einzel > 0 ? String(einzel).replace(".", ",") : "";
  }

  return (
    <PortalDetailCard title={einholung ? "Leistungsverzeichnis" : "Kalkulation / Angebot"}>
      {einholung ? (
        <p className="portal-text-body text-text-secondary mb-3">
          Positionen aus der Anfrage — bitte Menge und Preis je Zeile ergänzen.
        </p>
      ) : (
        <p className="portal-text-body text-text-secondary mb-3">
          Positionen anlegen, Summen prüfen und einreichen. Das Angebot erscheint
          bei Bärenwald und der Verwaltung als empfohlenes Angebot.
        </p>
      )}

      {einholung ? null : (
        <div className="mb-3 flex rounded-[10px] border border-border-default bg-white p-1">
          {(
            [
              ["kalkulieren", "Kalkulieren"],
              ["upload", "PDF-Upload (Standard)"],
            ] as const
          ).map(([key, label]) => (
            <PortalButton
              variant="ghost"
              key={key}
              type="button"
              className={cn(
                "flex-1 rounded-button py-2 text-fs-meta font-semibold",
                modus === key
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary"
              )}
              onClick={() => setModus(key)}
            >
              {label}
            </PortalButton>
          ))}
        </div>
      )}

      {modus === "kalkulieren" || einholung ? (
        <div className="space-y-0 overflow-hidden rounded-sheet border border-border-default bg-white">
          {positionen.map((p, i) => {
            const { faktor, einheit } = splitHwMenge(p.menge);
            const vorgabePos = einholung && Boolean(p.pos.trim());
            const extraEinheit = (HW_MENGE_EINHEITEN as readonly string[]).includes(
              einheit
            )
              ? null
              : einheit;
            return (
              <div
                key={i}
                className="hw-kalk-pos border-b border-border-light px-3 py-3 last:border-b-0"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  {vorgabePos ? (
                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-semibold leading-snug text-text-primary">
                      {p.pos}
                    </p>
                  ) : (
                    <PortalInput
                      className="portal-input min-w-0 flex-1 rounded-field border border-border-default px-2.5 py-2 text-sm"
                      placeholder="Leistung / Position"
                      value={p.pos}
                      onChange={(e) =>
                        setPositionen(hwKalkPatch(positionen, i, "pos", e.target.value))
                      }
                    />
                  )}
                  <PortalButton
                    variant="ghost"
                    type="button"
                    className="shrink-0 px-1 text-lg leading-none text-text-tertiary"
                    title="Position entfernen"
                    onClick={() => setPositionen(hwKalkDel(positionen, i))}
                  >
                    ×
                  </PortalButton>
                </div>

                <div className="hw-kalk-pos__fields">
                  <PortalInput
                    className="portal-input hw-kalk-pos__field hw-kalk-pos__field--menge rounded-field border border-border-default px-2 py-2 text-center text-sm"
                    inputMode="decimal"
                    placeholder="1"
                    value={mengeDisplay(i, faktor)}
                    onFocus={() =>
                      setDraftMenge((prev) => ({
                        ...prev,
                        [i]: mengeDisplay(i, faktor),
                      }))
                    }
                    onBlur={() => {
                      setDraftMenge((prev) => {
                        const next = { ...prev };
                        delete next[i];
                        return next;
                      });
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftMenge((prev) => ({ ...prev, [i]: val }));
                      setPositionen(
                        hwKalkPatch(
                          positionen,
                          i,
                          "menge",
                          joinHwMenge(val || "1", einheit)
                        )
                      );
                    }}
                  />
                  {vorgabePos ? (
                    <div
                      className="portal-input hw-kalk-pos__field hw-kalk-pos__field--einheit flex items-center justify-center rounded-card border border-border-default bg-surface-muted px-2 py-2 text-center text-sm text-text-secondary"
                      aria-hidden
                    >
                      {einheit}
                    </div>
                  ) : (
                    <PortalSelect
                      className="portal-input hw-kalk-pos__field hw-kalk-pos__field--einheit rounded-field border border-border-default px-1.5 py-2 text-center text-sm"
                      value={einheit}
                      onChange={(e) =>
                        setPositionen(
                          hwKalkPatch(
                            positionen,
                            i,
                            "menge",
                            joinHwMenge(faktor, e.target.value)
                          )
                        )
                      }
                    >
                      {extraEinheit ? (
                        <option value={extraEinheit}>{extraEinheit}</option>
                      ) : null}
                      {HW_MENGE_EINHEITEN.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </PortalSelect>
                  )}
                  <div className="hw-kalk-pos__field--preis-wrap">
                    <PortalInput
                      type="text"
                      inputMode="decimal"
                      className="portal-input hw-kalk-pos__field hw-kalk-pos__field--preis w-full rounded-field border border-border-default py-2 pl-2 pr-6 text-right text-sm"
                      placeholder="0"
                      value={einzelDisplay(i, p.einzel)}
                      onFocus={() =>
                        setDraftEinzel((prev) => ({
                          ...prev,
                          [i]: einzelDisplay(i, p.einzel),
                        }))
                      }
                      onBlur={() => {
                        setDraftEinzel((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        });
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftEinzel((prev) => ({ ...prev, [i]: val }));
                        setPositionen(
                          hwKalkPatch(
                            positionen,
                            i,
                            "einzel",
                            parseDecimalInput(val)
                          )
                        );
                      }}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                      €
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-sheet border border-dashed border-border-default p-4 text-sm text-text-secondary">
          PDF-Upload nutzt die Standard-Positionen als Angebotsbasis. Für
          detaillierte Kalkulation den Modus „Kalkulieren“ wählen. Angebot-PDF
          können Sie nach Einreichung unter Unterlagen nachreichen.
        </p>
      )}

      {modus === "kalkulieren" || einholung ? (
        <PortalButton
          variant="ghost"
          type="button"
          className="mt-2 text-fs-meta font-semibold text-accent"
          onClick={() => setPositionen(hwKalkAdd(positionen))}
        >
          ＋ Position hinzufügen
        </PortalButton>
      ) : null}

      {einholung ? null : (
        <label className="mt-4 block">
          <span className="portal-text-meta text-text-tertiary">
            Voraussichtliche Dauer
          </span>
          <PortalInput
            className="portal-input mt-1 w-full max-w-xs rounded-field border border-border-default px-3 py-2 text-sm"
            value={dauer}
            onChange={(e) => setDauer(e.target.value)}
          />
        </label>
      )}

      <div className="mt-4 rounded-sheet border border-border-light bg-white px-4 py-3 text-sm">
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
        {einholung ? null : unterSchwelle ? (
          <p className="mt-2 text-xs font-semibold text-[var(--p2-status-green)]">
            Unter Freigabeschwelle ({formatHwMoney(schwelleEur)}) — nach
            Einreichung oft ohne HV-Freigabe-Schritt (Bärenwald Auto-Pfad).
          </p>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">
            Über Freigabeschwelle — die Verwaltung muss das Angebot erst
            freigeben.
          </p>
        )}
      </div>

      {error ? <PartnerDetailError message={error} /> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <PortalButton
          variant="primary"
          type="button"
          disabled={busy || !canSubmit}
          onClick={() => void onSubmit()}
        >
          {busy ? "Wird eingereicht…" : einholung ? "LV einreichen" : "Angebot einreichen"}
        </PortalButton>
        <PortalButton
          variant="secondary"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          Abbrechen
        </PortalButton>
      </div>
    </PortalDetailCard>
  );
}
