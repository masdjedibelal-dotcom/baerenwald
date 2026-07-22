"use client";

import { useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  formatServicepaketPreisAb,
  SERVICEPAKET_CTA,
  SERVICEPAKET_GROESSE_DEFAULT,
  SERVICEPAKET_GROESSE_LABEL,
  SERVICEPAKET_GROESSEN,
  SERVICEPAKET_OK_BODY,
  SERVICEPAKET_OK_CLOSE,
  SERVICEPAKET_OK_TITLE,
  SERVICEPAKET_PREIS_HINWEIS,
  SERVICEPAKETE,
  SERVICEPAKETE_INTRO,
  SERVICEPAKETE_PAGE_TITLE,
  servicepaketOkHeadline,
  servicepaketPreisAb,
  type ServicepaketCard,
  type ServicepaketGroesseId,
} from "@/lib/portal2/servicepakete";
import { portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  onRequested?: () => void;
};

export function OrganisationServicepaketePanel({ onRequested }: Props) {
  const [groesse, setGroesse] = useState<ServicepaketGroesseId>(
    SERVICEPAKET_GROESSE_DEFAULT
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [okName, setOkName] = useState<string | null>(null);

  const requestPaket = async (p: ServicepaketCard) => {
    setBusyId(p.id);
    const preisAb = servicepaketPreisAb(p, groesse);
    try {
      const res = await fetch("/api/org/servicepaket-anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paket: p.id,
          paketName: p.name,
          groesse,
          preisAb,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Anfrage fehlgeschlagen", json.error);
        return;
      }
      setOkName(p.name);
      onRequested?.();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="portal-text-section text-text-primary">
          {SERVICEPAKETE_PAGE_TITLE}
        </h2>
        <p className="max-w-[640px] text-[13.5px] leading-relaxed text-text-secondary">
          {SERVICEPAKETE_INTRO}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-secondary">
            {SERVICEPAKET_GROESSE_LABEL}
          </span>
          <select
            className="h-10 rounded-[10px] border-[1.5px] border-[var(--border-default,#e3e6ea)] bg-white px-3 text-[13.5px] font-medium text-text-primary outline-none focus:border-accent"
            value={groesse}
            onChange={(e) =>
              setGroesse(e.target.value as ServicepaketGroesseId)
            }
            aria-label={SERVICEPAKET_GROESSE_LABEL}
          >
            {SERVICEPAKET_GROESSEN.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {SERVICEPAKETE.map((p) => {
          const preisAb = servicepaketPreisAb(p, groesse);
          return (
            <article
              key={p.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border-[1.5px] bg-white",
                p.pop ? "shadow-[0_12px_30px_-12px]" : "shadow-sm"
              )}
              style={{
                borderColor: p.pop ? p.accent : "var(--border-default, #e3e6ea)",
                boxShadow: p.pop
                  ? `0 12px 30px -12px ${p.accent}55`
                  : undefined,
              }}
            >
              {p.pop ? (
                <div
                  className="absolute right-3.5 top-3.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white"
                  style={{ background: p.accent }}
                >
                  Beliebt
                </div>
              ) : null}

              <div
                className="grid h-[120px] place-items-center text-[44px]"
                style={{ background: p.tint }}
                aria-hidden
              >
                {p.ic}
              </div>

              <div className="flex flex-1 flex-col px-5 py-[18px]">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-text-primary">
                  {p.name}
                </h3>
                <p className="mb-3.5 mt-2 min-h-0 text-[13px] leading-snug text-text-secondary lg:min-h-[58px]">
                  {p.desc}
                </p>
                <div className="mb-3.5 flex items-baseline gap-1">
                  <span
                    className="font-[family-name:var(--font-display)] text-[26px] font-extrabold"
                    style={{ color: p.accent }}
                  >
                    {formatServicepaketPreisAb(preisAb)}
                  </span>
                  <span className="text-[13px] font-semibold text-text-tertiary">
                    {p.zyklus}
                  </span>
                </div>
                <ul className="mb-[18px] flex flex-1 flex-col gap-2">
                  {p.feats.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[13px] text-text-primary"
                    >
                      <span
                        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[11px]"
                        style={{
                          background: `${p.accent}1f`,
                          color: p.accent,
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
                  disabled={busyId !== null}
                  onClick={() => void requestPaket(p)}
                  className="w-full rounded-[10px] py-3 font-[family-name:var(--font-display)] text-sm font-bold disabled:opacity-60"
                  style={
                    p.pop
                      ? {
                          background: p.accent,
                          color: "#fff",
                          border: "none",
                        }
                      : {
                          background: "#fff",
                          color: p.accent,
                          border: `1.5px solid ${p.accent}`,
                        }
                  }
                >
                  {busyId === p.id ? "Wird angefragt…" : SERVICEPAKET_CTA}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="max-w-[640px] text-[12.5px] leading-relaxed text-text-tertiary">
        {SERVICEPAKET_PREIS_HINWEIS}
      </p>

      {okName ? (
        <PortalModalShell
          open
          title={SERVICEPAKET_OK_TITLE}
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
              {servicepaketOkHeadline(okName)}
            </p>
            <p className="mx-auto mb-[18px] max-w-[320px] text-[13.5px] leading-relaxed text-text-secondary">
              {SERVICEPAKET_OK_BODY}
            </p>
            <button
              type="button"
              className="rounded-[10px] bg-accent px-[26px] py-[11px] text-sm font-semibold text-white"
              onClick={() => setOkName(null)}
            >
              {SERVICEPAKET_OK_CLOSE}
            </button>
          </div>
        </PortalModalShell>
      ) : null}
    </div>
  );
}
