"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveMeldeUrsachenCheck } from "@/app/actions/melde-ursachen";
import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import {
  meldeAnswerDisplayLabel,
  meldeQuestionDisplayLabel,
} from "@/lib/funnel/melde-dynamic-questions";
import {
  meldeMaterialOptions,
  meldeSchadenKurz,
  meldeUrsacheLabel,
  meldeUrsachenForAnswers,
  parseMeldeUrsachenCheck,
  type MeldeUrsachenBereich,
  type MeldeUrsachenCheckState,
} from "@/lib/org/melde-ursachen";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

const MELDE_ROW_ORDER = [
  "melde_problem",
  "melde_tuer_detail",
  "melde_ort",
  "melde_ort_tuer",
  "melde_ort_schluessel",
  "melde_ort_fassade",
  "melde_ort_graffiti",
  "melde_ort_treppe",
  "melde_ort_wespen",
  "melde_groesse",
  "melde_staerke",
  "melde_ort_hecke",
  "melde_ort_platten",
  "melde_ort_laub",
  "melde_passierbar",
  "melde_ort_ziegel",
  "melde_bei_regen",
  "melde_betrifft",
  "melde_seit_wann",
  "melde_seit_wann_akut",
  "melde_geht_zu",
  "melde_heizung_kalt",
  "melde_warmwasser",
  "melde_sicherung_raus",
  "melde_wieder_raus",
  "melde_nachbarn_strom",
  "melde_laeuft_noch",
  "melde_abstellen",
  "melde_gefahr",
  "melde_wohnung_kalt",
  "melde_nachbarn",
  "melde_fi",
  "melde_stromausfall",
  "melde_abschliessbar",
] as const;

type MeldeRow = { label: string; value: string };

function meldeAnswerRows(answers: MeldeAnswers): MeldeRow[] {
  const rows: MeldeRow[] = [];
  for (const id of MELDE_ROW_ORDER) {
    const raw = answers[id];
    if (raw === undefined || raw === null || raw === "") continue;
    const value = meldeAnswerDisplayLabel(id, raw);
    if (!value) continue;
    rows.push({
      label: meldeQuestionDisplayLabel(id) || id,
      value,
    });
  }
  return rows;
}

type Props = {
  leadId: string;
  bereich: MeldeUrsachenBereich;
  answers: MeldeAnswers;
  initial?: MeldeUrsachenCheckState | null;
  mode: "edit" | "summary";
  className?: string;
  onSaved?: () => void;
};

/**
 * Eine Card: Melde-Angaben + Ursachen-Einschätzung (Wasser / Heizung).
 * Kein Einfluss auf HV-CTAs oder Workflow.
 */
export function MeldeUrsachenWasserPanel({
  leadId,
  bereich,
  answers,
  initial,
  mode,
  className,
  onSaved,
}: Props) {
  const router = useRouter();
  const ursachen = useMemo(
    () => meldeUrsachenForAnswers(bereich, answers),
    [bereich, answers]
  );
  const meldeRows = useMemo(() => meldeAnswerRows(answers), [answers]);
  const materials = useMemo(() => meldeMaterialOptions(bereich), [bereich]);
  const [selected, setSelected] = useState<string | null>(
    initial?.selectedUrsacheId ?? null
  );
  const [sonstigesText, setSonstigesText] = useState(
    initial?.sonstigesText ?? ""
  );
  const [entscheidung, setEntscheidung] = useState<
    "hm_geloest" | "fachfirma" | null
  >(initial?.entscheidung ?? null);
  const [material, setMaterial] = useState<string[]>(initial?.material ?? []);
  const [busy, setBusy] = useState(false);

  const schaden = meldeSchadenKurz(bereich, answers);
  const saved = Boolean(initial?.entscheidung && initial.selectedUrsacheId);

  if (mode === "summary") {
    if (!saved || !initial) {
      if (meldeRows.length === 0) return null;
      return (
        <section
          className={cn(
            "rounded-xl border border-border-default bg-white p-4",
            className
          )}
        >
          <h3 className="portal-text-section mb-3">Meldung</h3>
          <MeldeRowsList rows={meldeRows} />
        </section>
      );
    }
    return (
      <section
        className={cn(
          "rounded-xl border border-border-default bg-white p-4",
          className
        )}
      >
        <h3 className="portal-text-section mb-3">Meldung & Ursache</h3>
        {meldeRows.length > 0 ? (
          <div className="mb-4">
            <MeldeRowsList rows={meldeRows} />
          </div>
        ) : (
          <p className="mb-3 portal-text-body font-semibold text-text-primary">
            {schaden}
          </p>
        )}
        <dl className="mt-3 divide-y divide-border-light border-t border-border-light">
          <div className="flex justify-between gap-3 py-2.5">
            <dt className="portal-text-meta text-text-secondary">Ursache</dt>
            <dd className="portal-text-body text-right font-semibold text-text-primary">
              {meldeUrsacheLabel(bereich, initial.selectedUrsacheId)}
              {initial.selectedUrsacheId === "sonstiges" &&
              initial.sonstigesText
                ? ` — ${initial.sonstigesText}`
                : null}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2.5">
            <dt className="portal-text-meta text-text-secondary">Einschätzung</dt>
            <dd className="portal-text-body text-right font-semibold text-text-primary">
              {initial.entscheidung === "hm_geloest"
                ? "Hausmeister hat gelöst"
                : "Fachfirma notwendig"}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  async function onSave() {
    setBusy(true);
    const res = await saveMeldeUrsachenCheck({
      leadId,
      bereich,
      selectedUrsacheId: selected,
      sonstigesText:
        selected === "sonstiges" ? sonstigesText.trim() || null : null,
      entscheidung,
      material: entscheidung === "hm_geloest" ? material : [],
    });
    setBusy(false);
    if (!res.ok) {
      portalToastError("Nicht gespeichert", res.error);
      return;
    }
    portalToastSuccess("Ursache gespeichert", "Nur Dokumentation am Vorgang.");
    onSaved?.();
    router.refresh();
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border-default bg-white p-4",
        className
      )}
    >
      <h3 className="portal-text-section">Meldung & Ursache</h3>
      <p className="portal-text-meta mt-1 text-text-secondary">
        Angaben aus dem Melde-Funnel. Ursache dokumentieren — ohne Einfluss auf
        Freigabe oder Angebot.
      </p>

      {meldeRows.length > 0 ? (
        <div className="mt-3">
          <MeldeRowsList rows={meldeRows} />
        </div>
      ) : (
        <p className="portal-text-meta mt-2">{schaden}</p>
      )}

      <div className="mt-4 border-t border-border-light pt-3">
        <p className="portal-text-label">Ursache (nach Wahrscheinlichkeit)</p>
        <ul className="mt-2 divide-y divide-border-light border-y border-border-light">
          {ursachen.map((u, i) => {
            const on = selected === u.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setSelected(u.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-0 py-3 text-left transition-colors",
                    on
                      ? "text-[var(--org-primary,#2e7d52)]"
                      : "text-text-primary hover:bg-[var(--p2-hover,#f7f8fa)]"
                  )}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: on
                        ? "var(--org-primary,#2e7d52)"
                        : "#eceeed",
                      color: on ? "#fff" : "#5c6661",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="portal-text-body font-semibold">{u.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {selected === "sonstiges" ? (
          <input
            className="portal-input mt-2 w-full rounded-lg border border-border-default px-3 py-2 text-[13.5px]"
            placeholder="Kurz beschreiben…"
            value={sonstigesText}
            onChange={(e) => setSonstigesText(e.target.value)}
          />
        ) : null}

        <p className="portal-text-label mt-4">Einschätzung</p>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setEntscheidung("hm_geloest")}
            className={cn(
              "portal-text-body flex-1 rounded-lg border px-3 py-2.5 font-semibold",
              entscheidung === "hm_geloest"
                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                : "border-border-light text-text-secondary"
            )}
          >
            Hausmeister hat gelöst
          </button>
          <button
            type="button"
            onClick={() => setEntscheidung("fachfirma")}
            className={cn(
              "portal-text-body flex-1 rounded-lg border px-3 py-2.5 font-semibold",
              entscheidung === "fachfirma"
                ? "border-amber-600 bg-amber-50 text-amber-950"
                : "border-border-light text-text-secondary"
            )}
          >
            Fachfirma notwendig
          </button>
        </div>

        {entscheidung === "hm_geloest" ? (
          <div className="mt-3">
            <p className="portal-text-label mb-1.5">Material (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m) => {
                const on = material.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() =>
                      setMaterial((prev) =>
                        on
                          ? prev.filter((x) => x !== m.value)
                          : [...prev, m.value]
                      )
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                      on
                        ? "border-[var(--org-primary)] bg-[var(--org-primary-soft)] text-[var(--org-primary)]"
                        : "border-border-light text-text-secondary"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || !selected || !entscheidung}
          onClick={() => void onSave()}
          className="portal-text-body mt-4 w-full rounded-lg border border-border-default bg-[var(--p2-selected,#f0f2f0)] px-3 py-2.5 font-semibold text-text-primary disabled:opacity-50"
        >
          {busy
            ? "Speichern…"
            : saved
              ? "Ursache aktualisieren"
              : "Ursache speichern"}
        </button>
      </div>
    </section>
  );
}

function MeldeRowsList({ rows }: { rows: MeldeRow[] }) {
  return (
    <dl className="divide-y divide-border-light border-y border-border-light">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-3 py-2.5"
        >
          <dt className="portal-text-meta text-text-secondary">{row.label}</dt>
          <dd className="portal-text-body text-right font-semibold text-text-primary">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function meldeUrsachenFromFunnel(
  funnelDaten: unknown
): MeldeUrsachenCheckState | null {
  return parseMeldeUrsachenCheck(funnelDaten);
}
