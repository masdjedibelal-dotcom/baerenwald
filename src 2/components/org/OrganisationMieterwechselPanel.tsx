"use client";

import { useMemo, useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import type { OrganisationObjekt } from "@/lib/org/types";
import {
  berechneMieterwechselPreis,
  formatMieterwechselPreisPrefix,
  MIETERWECHSEL_CTA_ANGEBOT,
  MIETERWECHSEL_GROESSE_DEFAULT,
  MIETERWECHSEL_GROESSEN,
  MIETERWECHSEL_INTRO,
  MIETERWECHSEL_MODULE,
  MIETERWECHSEL_OK_BODY,
  MIETERWECHSEL_OK_CLOSE,
  MIETERWECHSEL_OK_TITLE,
  MIETERWECHSEL_PAGE_EYEBROW,
  MIETERWECHSEL_PAGE_TITLE,
  MIETERWECHSEL_PREIS_HINWEIS,
  MIETERWECHSEL_STUFEN,
  MIETERWECHSEL_ZUBUCH,
  mieterwechselCta,
  mieterwechselOkHeadline,
  type MieterwechselGroesseId,
  type MieterwechselModulId,
  type MieterwechselStufeId,
  type MieterwechselZubuchId,
} from "@/lib/portal2/mieterwechsel";
import { portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  objekte: OrganisationObjekt[];
  onRequested?: () => void;
};

function toggleIn<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function OrganisationMieterwechselPanel({
  objekte,
  onRequested,
}: Props) {
  const [groesse, setGroesse] = useState<MieterwechselGroesseId>(
    MIETERWECHSEL_GROESSE_DEFAULT
  );
  const [m2Text, setM2Text] = useState("");
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? "");
  const [zubuch, setZubuch] = useState<MieterwechselZubuchId[]>([]);
  const [module, setModule] = useState<MieterwechselModulId[]>([]);
  const [busyStufe, setBusyStufe] = useState<MieterwechselStufeId | null>(null);
  const [okName, setOkName] = useState<string | null>(null);

  const m2 = useMemo(() => {
    const n = Number(String(m2Text).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [m2Text]);

  const preise = useMemo(() => {
    const map = new Map<
      MieterwechselStufeId,
      ReturnType<typeof berechneMieterwechselPreis>
    >();
    for (const s of MIETERWECHSEL_STUFEN) {
      map.set(
        s.id,
        berechneMieterwechselPreis({
          stufe: s.id,
          groesse,
          m2,
          zubuch,
          module: s.id === 3 ? module : [],
        })
      );
    }
    return map;
  }, [groesse, m2, zubuch, module]);

  const requestStufe = async (stufeId: MieterwechselStufeId) => {
    if (!objektId) {
      portalToastError("Bitte Objekt wählen.");
      return;
    }
    const stufe = MIETERWECHSEL_STUFEN.find((s) => s.id === stufeId)!;
    const preis = preise.get(stufeId)!;
    setBusyStufe(stufeId);
    try {
      const res = await fetch("/api/org/mieterwechsel-anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stufe: stufeId,
          groesse,
          m2,
          objektId,
          zubuch,
          module: stufeId === 3 ? module : [],
          preisMin: preis.min,
          preisMax: preis.max,
          isFix: preis.isFix,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Anfrage fehlgeschlagen", json.error);
        return;
      }
      setOkName(stufe.name);
      onRequested?.();
    } finally {
      setBusyStufe(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
          {MIETERWECHSEL_PAGE_EYEBROW}
        </p>
        <h2 className="portal-text-section text-text-primary">
          {MIETERWECHSEL_PAGE_TITLE}
        </h2>
        <p className="max-w-[640px] text-[13.5px] leading-relaxed text-text-secondary">
          {MIETERWECHSEL_INTRO}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 sm:max-w-[260px]">
          <span className="text-[12px] font-semibold text-text-secondary">
            Objekt
          </span>
          <select
            className="h-10 rounded-[10px] border-[1.5px] border-[var(--border-default,#e3e6ea)] bg-white px-3 text-[13.5px] font-medium text-text-primary outline-none focus:border-accent"
            value={objektId}
            onChange={(e) => setObjektId(e.target.value)}
            aria-label="Objekt"
          >
            {objekte.length === 0 ? (
              <option value="">Kein Objekt vorhanden</option>
            ) : (
              objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titel}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="flex min-w-[160px] flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-secondary">
            Wohnungsgröße
          </span>
          <select
            className="h-10 rounded-[10px] border-[1.5px] border-[var(--border-default,#e3e6ea)] bg-white px-3 text-[13.5px] font-medium text-text-primary outline-none focus:border-accent"
            value={groesse}
            onChange={(e) =>
              setGroesse(e.target.value as MieterwechselGroesseId)
            }
            aria-label="Wohnungsgröße"
          >
            {MIETERWECHSEL_GROESSEN.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[120px] flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-secondary">
            Wohnfläche m²
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="z. B. 68"
            value={m2Text}
            onChange={(e) => setM2Text(e.target.value)}
            className="h-10 w-[120px] rounded-[10px] border-[1.5px] border-[var(--border-default,#e3e6ea)] bg-white px-3 text-[13.5px] font-medium text-text-primary outline-none focus:border-accent"
            aria-label="Wohnfläche in Quadratmetern"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {MIETERWECHSEL_STUFEN.map((s) => {
          const preis = preise.get(s.id)!;
          const cta = mieterwechselCta(s.id, preis.isFix);
          return (
            <article
              key={s.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border-[1.5px] bg-white",
                s.pop ? "shadow-[0_12px_30px_-12px]" : "shadow-sm"
              )}
              style={{
                borderColor: s.pop ? s.accent : "var(--border-default, #e3e6ea)",
                boxShadow: s.pop
                  ? `0 12px 30px -12px ${s.accent}55`
                  : undefined,
              }}
            >
              {s.pop ? (
                <div
                  className="absolute right-3.5 top-3.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white"
                  style={{ background: s.accent }}
                >
                  Beliebt
                </div>
              ) : null}

              <div
                className="grid h-[100px] place-items-center text-[40px]"
                style={{ background: s.tint }}
                aria-hidden
              >
                {s.ic}
              </div>

              <div className="flex flex-1 flex-col px-5 py-[18px]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
                  Stufe {s.id}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-text-primary">
                  {s.name}
                </h3>
                <p className="mb-3.5 mt-2 min-h-0 text-[13px] leading-snug text-text-secondary lg:min-h-[58px]">
                  {s.desc}
                </p>
                <div className="mb-3.5 flex flex-col gap-0.5">
                  <span
                    className="font-[family-name:var(--font-display)] text-[22px] font-extrabold leading-tight"
                    style={{ color: s.accent }}
                  >
                    {formatMieterwechselPreisPrefix(preis)}
                  </span>
                  <span className="text-[12px] font-semibold text-text-tertiary">
                    {preis.isFix ? "Fixpreis netto" : "netto · Angebot"}
                  </span>
                </div>
                <ul className="mb-[18px] flex flex-1 flex-col gap-2">
                  {s.feats.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[13px] text-text-primary"
                    >
                      <span
                        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[11px]"
                        style={{
                          background: `${s.accent}1f`,
                          color: s.accent,
                        }}
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busyStufe !== null || !objektId}
                  onClick={() => void requestStufe(s.id)}
                  className="w-full rounded-[10px] py-3 font-[family-name:var(--font-display)] text-sm font-bold disabled:opacity-60"
                  style={
                    s.pop
                      ? {
                          background: s.accent,
                          color: "#fff",
                          border: "none",
                        }
                      : {
                          background: "#fff",
                          color: s.accent,
                          border: `1.5px solid ${s.accent}`,
                        }
                  }
                >
                  {busyStufe === s.id
                    ? "Wird gesendet…"
                    : cta === MIETERWECHSEL_CTA_ANGEBOT
                      ? MIETERWECHSEL_CTA_ANGEBOT
                      : cta}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border-[1.5px] border-[var(--border-default,#e3e6ea)] bg-white p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary">
          Zubuchbar auf jeder Stufe
        </h3>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Optionen werden zur Preisindikation addiert und mit der Anfrage
          mitgeschickt.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MIETERWECHSEL_ZUBUCH.map((z) => {
            const on = zubuch.includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setZubuch((prev) => toggleIn(prev, z.id))}
                className={cn(
                  "rounded-[10px] border-[1.5px] px-3 py-2 text-left text-[13px] font-semibold transition-colors",
                  on
                    ? "border-accent bg-accent-light text-accent"
                    : "border-[var(--border-default,#e3e6ea)] bg-white text-text-primary hover:border-accent/50"
                )}
                aria-pressed={on}
              >
                <span className="block">{z.label}</span>
                <span className="block text-[11px] font-medium opacity-70">
                  {z.hint}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-[var(--border-default,#e3e6ea)] pt-4">
          <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-text-primary">
            Module nur Stufe 3 „Renoviert“
          </h3>
          <p className="mt-1 text-[12.5px] text-text-secondary">
            Zusammenklicken — Indikation aktualisiert sich live auf der
            Renoviert-Karte.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MIETERWECHSEL_MODULE.map((m) => {
              const on = module.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModule((prev) => toggleIn(prev, m.id))}
                  className={cn(
                    "rounded-[10px] border-[1.5px] px-3 py-2 text-left text-[13px] font-semibold transition-colors",
                    on
                      ? "border-[#8B6914] bg-[#F5F0E8] text-[#8B6914]"
                      : "border-[var(--border-default,#e3e6ea)] bg-white text-text-primary hover:border-[#8B6914]/50"
                  )}
                  aria-pressed={on}
                >
                  <span className="block">{m.label}</span>
                  <span className="block text-[11px] font-medium opacity-70">
                    {m.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="max-w-[720px] text-[12.5px] leading-relaxed text-text-tertiary">
        {MIETERWECHSEL_PREIS_HINWEIS}
      </p>

      {okName ? (
        <PortalModalShell
          open
          title={MIETERWECHSEL_OK_TITLE}
          onClose={() => setOkName(null)}
        >
          <div className="px-1 py-1.5 text-center">
            <div
              className="mx-auto mb-4 grid h-[60px] w-[60px] place-items-center rounded-2xl text-[28px] text-accent"
              style={{ background: "var(--accent-light, #E7F1E9)" }}
            >
              ✓
            </div>
            <p className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
              {mieterwechselOkHeadline(okName)}
            </p>
            <p className="mx-auto mb-[18px] max-w-[320px] text-[13.5px] leading-relaxed text-text-secondary">
              {MIETERWECHSEL_OK_BODY}
            </p>
            <button
              type="button"
              className="rounded-[10px] bg-accent px-[26px] py-[11px] text-sm font-semibold text-white"
              onClick={() => setOkName(null)}
            >
              {MIETERWECHSEL_OK_CLOSE}
            </button>
          </div>
        </PortalModalShell>
      ) : null}
    </div>
  );
}
