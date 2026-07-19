"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OrganisationObjektMieterMenu } from "@/components/org/OrganisationObjektMieterMenu";
import type { OrganisationLead } from "@/lib/org/types";
import {
  OBJ_MIETER_PORTAL_STATUS,
  resolveObjMieterPortalStatus,
} from "@/lib/portal2/objekte";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Bewohner = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  objekt_einheit_id: string;
  objekt_einheiten?: { bezeichnung?: string | null } | null;
};

type Props = {
  objektId: string;
  leads: OrganisationLead[];
  onEinladen: () => void;
  onGotoVorgaenge: () => void;
};

/**
 * E2 Tab „Mieter“ — Liste + `objMieterMenu` (Einladen E4 / Entfernen).
 */
export function OrganisationObjektMieterTab({
  objektId,
  leads,
  onEinladen,
  onGotoVorgaenge,
}: Props) {
  const [bewohner, setBewohner] = useState<Bewohner[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/org/einheit-bewohner?objektId=${encodeURIComponent(objektId)}`
    );
    const json = (await res.json()) as { bewohner?: Bewohner[] };
    setBewohner(json.bewohner ?? []);
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  const vorgangCountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const mail = (l.melder_email ?? "").trim().toLowerCase();
      const name = (l.melder_name ?? "").trim().toLowerCase();
      if (mail) map.set(`mail:${mail}`, (map.get(`mail:${mail}`) ?? 0) + 1);
      if (name) map.set(`name:${name}`, (map.get(`name:${name}`) ?? 0) + 1);
    }
    return map;
  }, [leads]);

  const entfernen = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Mieter „${name}“ wirklich entfernen? Vorgänge bleiben erhalten.`
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/org/einheit-bewohner?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Entfernen fehlgeschlagen", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Mieter
        </p>
        <button
          type="button"
          className="rounded-[9px] border border-accent bg-accent-light px-3 py-1.5 text-[12.5px] font-semibold text-accent"
          onClick={onEinladen}
        >
          ＋ Mieter einladen
        </button>
      </div>

      {bewohner.length === 0 ? (
        <p className="rounded-xl border border-border-default bg-white p-4 text-[13px] text-text-secondary">
          Noch keine Mieter erfasst. Laden Sie Bewohner über den Tab Einheiten
          ein oder teilen Sie den Melde-Link.
        </p>
      ) : (
        <ul className="space-y-2">
          {bewohner.map((b) => {
            const we = b.objekt_einheiten?.bezeichnung?.trim() || "Einheit";
            const mail = b.email?.trim() || "";
            const statusKey = resolveObjMieterPortalStatus({ email: mail });
            const status = OBJ_MIETER_PORTAL_STATUS[statusKey];
            const n =
              (mail
                ? vorgangCountByKey.get(`mail:${mail.toLowerCase()}`)
                : undefined) ??
              vorgangCountByKey.get(`name:${b.name.trim().toLowerCase()}`) ??
              0;
            const initial = (b.name.trim()[0] || "?").toUpperCase();

            return (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-border-default bg-white px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-text-primary">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-text-primary">
                    {b.name}
                  </p>
                  <p className="truncate text-[12px] text-text-secondary">
                    {we}
                    {mail ? ` · ${mail}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-text-tertiary">
                    {status}
                    {n > 0 ? ` · ${n} Vorgänge` : ""}
                  </p>
                </div>
                <OrganisationObjektMieterMenu
                  hasEmail={Boolean(mail)}
                  onEinladen={onEinladen}
                  onVorgaenge={onGotoVorgaenge}
                  onEntfernen={() => {
                    if (busyId) return;
                    void entfernen(b.id, b.name);
                  }}
                  onBearbeiten={() =>
                    portalToastError(
                      "Noch nicht verfügbar",
                      "Mieter-Stammdaten bearbeiten folgt."
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
