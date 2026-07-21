"use client";

import { useEffect, useRef, useState } from "react";

import {
  EinstellungenCard,
  EinstellungenChoiceCard,
  EinstellungenEuroInput,
  EinstellungenInfoBox,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import type {
  FreigabeModus,
  OrganisationKunde,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  EINSTELLUNGEN_ANGEBOT_FREIGABE_INTRO,
  EINSTELLUNGEN_ANGEBOT_FREIGABE_TITLE,
  EINSTELLUNGEN_KLEINREPARATUR_INTRO,
  EINSTELLUNGEN_KLEINREPARATUR_TITLE,
  EINSTELLUNGEN_OBJEKT_SCHWELLE_INTRO,
  EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_PRESETS,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  einstellungenSchwelleInfo,
  formatEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type AngebotBehandlung = "freigabe" | "direkt" | "notfall";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  onSaved: () => void;
  isAdmin?: boolean;
};

function resolveBehandlung(
  modus: FreigabeModus,
  notfallDirekt: boolean
): AngebotBehandlung {
  if (modus === "direkt") return "direkt";
  return notfallDirekt ? "notfall" : "freigabe";
}

function behandlungToPatch(b: AngebotBehandlung): {
  freigabe_modus: FreigabeModus;
  notfall_direkt: boolean;
} {
  if (b === "direkt") {
    return { freigabe_modus: "direkt", notfall_direkt: true };
  }
  if (b === "notfall") {
    return { freigabe_modus: "freigabe", notfall_direkt: true };
  }
  return { freigabe_modus: "freigabe", notfall_direkt: false };
}

/**
 * Mock Freigabe-Regeln: Standard-Schwelle, Kleinreparatur, Objekt-Ausnahmen, Angebots-Modus.
 */
export function OrganisationFreigabeRegelnPanel({
  kunde,
  objekte,
  onSaved,
  isAdmin = true,
}: Props) {
  const [schwelle, setSchwelle] = useState(() =>
    kunde.freigabe_schwelle_eur != null
      ? Number(kunde.freigabe_schwelle_eur)
      : 500
  );
  const [kleinAktiv, setKleinAktiv] = useState(
    kunde.kleinreparatur_aktiv === true
  );
  const [kleinSchwelle, setKleinSchwelle] = useState(
    Number(kunde.kleinreparatur_schwelle_eur ?? 150)
  );
  const [behandlung, setBehandlung] = useState<AngebotBehandlung>(() =>
    resolveBehandlung(
      kunde.freigabe_modus ?? "freigabe",
      kunde.notfall_direkt !== false
    )
  );
  const [objektDraft, setObjektDraft] = useState<Record<string, string>>({});

  const schwelleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kleinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objektTimers = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});

  useEffect(() => {
    setSchwelle(
      kunde.freigabe_schwelle_eur != null
        ? Number(kunde.freigabe_schwelle_eur)
        : 500
    );
    setKleinAktiv(kunde.kleinreparatur_aktiv === true);
    setKleinSchwelle(Number(kunde.kleinreparatur_schwelle_eur ?? 150));
    setBehandlung(
      resolveBehandlung(
        kunde.freigabe_modus ?? "freigabe",
        kunde.notfall_direkt !== false
      )
    );
  }, [
    kunde.freigabe_schwelle_eur,
    kunde.kleinreparatur_aktiv,
    kunde.kleinreparatur_schwelle_eur,
    kunde.freigabe_modus,
    kunde.notfall_direkt,
  ]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const o of objekte) {
      next[o.id] =
        o.freigabe_schwelle_eur != null
          ? String(Math.round(Number(o.freigabe_schwelle_eur)))
          : "";
    }
    setObjektDraft(next);
  }, [objekte]);

  useEffect(() => {
    return () => {
      if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
      if (kleinTimer.current) clearTimeout(kleinTimer.current);
      for (const t of Object.values(objektTimers.current)) {
        if (t) clearTimeout(t);
      }
    };
  }, []);

  const patchEinstellungen = async (body: Record<string, unknown>) => {
    if (!isAdmin) return false;
    try {
      const res = await fetch("/api/org/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Nicht gespeichert", json.error);
        return false;
      }
      orgPortalToast.einstellungenGespeichert();
      onSaved();
      return true;
    } catch {
      portalToastError("Nicht gespeichert");
      return false;
    }
  };

  const onSchwelleChange = (value: number) => {
    setSchwelle(value);
    if (!isAdmin) return;
    if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    schwelleTimer.current = setTimeout(() => {
      void patchEinstellungen({ freigabe_schwelle_eur: value });
    }, 450);
  };

  const onKleinSchwelleChange = (value: number) => {
    setKleinSchwelle(value);
    if (!isAdmin) return;
    if (kleinTimer.current) clearTimeout(kleinTimer.current);
    kleinTimer.current = setTimeout(() => {
      void patchEinstellungen({
        kleinreparatur_aktiv: true,
        kleinreparatur_schwelle_eur: value,
      });
    }, 450);
  };

  const onKleinAktivChange = (checked: boolean) => {
    setKleinAktiv(checked);
    void patchEinstellungen({ kleinreparatur_aktiv: checked });
  };

  const onBehandlungChange = (next: AngebotBehandlung) => {
    setBehandlung(next);
    void patchEinstellungen(behandlungToPatch(next));
  };

  const patchObjektSchwelle = async (
    objektId: string,
    value: number | null
  ) => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objektId,
          freigabe_schwelle_eur: value,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Objekt-Schwelle nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.einstellungenGespeichert();
      onSaved();
    } catch {
      portalToastError("Objekt-Schwelle nicht gespeichert");
    }
  };

  const onObjektDraftChange = (objektId: string, raw: string) => {
    setObjektDraft((prev) => ({ ...prev, [objektId]: raw }));
    if (!isAdmin) return;
    const existing = objektTimers.current[objektId];
    if (existing) clearTimeout(existing);
    objektTimers.current[objektId] = setTimeout(() => {
      const trimmed = raw.trim();
      if (!trimmed) {
        void patchObjektSchwelle(objektId, null);
        return;
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return;
      void patchObjektSchwelle(objektId, Math.round(n));
    }, 500);
  };

  const resetObjekt = (objektId: string) => {
    setObjektDraft((prev) => ({ ...prev, [objektId]: "" }));
    void patchObjektSchwelle(objektId, null);
  };

  return (
    <div className="flex flex-col gap-3">
      {!isAdmin ? (
        <p
          className="rounded-[9px] border border-border-default px-3.5 py-[11px] text-[13px] leading-[1.55]"
          style={{ color: PORTAL_C.sub }}
        >
          Nur Administratoren können Freigabe-Regeln und Schwellen ändern.
        </p>
      ) : null}

      <EinstellungenCard title={EINSTELLUNGEN_SCHWELLE_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            {EINSTELLUNGEN_SCHWELLE_INTRO}
          </p>
          <EinstellungenEuroInput
            value={schwelle}
            disabled={!isAdmin}
            presets={EINSTELLUNGEN_SCHWELLE_PRESETS}
            onChange={onSchwelleChange}
          />
          <EinstellungenInfoBox>
            {einstellungenSchwelleInfo(schwelle)}
          </EinstellungenInfoBox>
        </div>
      </EinstellungenCard>

      <EinstellungenCard title={EINSTELLUNGEN_KLEINREPARATUR_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            {EINSTELLUNGEN_KLEINREPARATUR_INTRO}
          </p>
          <EinstellungenToggle
            checked={kleinAktiv}
            disabled={!isAdmin}
            onChange={onKleinAktivChange}
            title="Kleinreparaturen ohne Angebot"
            description={
              kleinAktiv
                ? `Aktiv bis ${formatEinstellungenSchwelle(kleinSchwelle)}`
                : "Deaktiviert — jede Reparatur braucht ein Angebot"
            }
          />
          {kleinAktiv ? (
            <EinstellungenEuroInput
              value={kleinSchwelle}
              disabled={!isAdmin}
              presets={EINSTELLUNGEN_SCHWELLE_PRESETS}
              max={2000}
              onChange={onKleinSchwelleChange}
            />
          ) : null}
        </div>
      </EinstellungenCard>

      <EinstellungenCard title={EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            {EINSTELLUNGEN_OBJEKT_SCHWELLE_INTRO}
          </p>
          {objekte.length === 0 ? (
            <p
              className="text-[13px] leading-[1.55]"
              style={{ color: PORTAL_C.sub }}
            >
              Noch keine Objekte — Ausnahmen erscheinen nach dem Anlegen.
            </p>
          ) : (
            <div className="flex flex-col gap-[9px]">
              {objekte.map((o) => {
                const draft = objektDraft[o.id] ?? "";
                const hasOverride = draft.trim().length > 0;
                return (
                  <div
                    key={o.id}
                    className="rounded-[11px] border border-border-default px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-text-primary">
                          {o.titel}
                        </p>
                        <p
                          className="mt-0.5 text-[12px]"
                          style={{ color: PORTAL_C.sub }}
                        >
                          {hasOverride
                            ? "Abweichung von der Standard-Regel"
                            : `Standard · ${formatEinstellungenSchwelle(schwelle)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <label className="relative block w-[92px]">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={5000}
                            step={50}
                            disabled={!isAdmin}
                            placeholder={String(schwelle)}
                            value={draft}
                            onChange={(e) =>
                              onObjektDraftChange(o.id, e.target.value)
                            }
                            className="w-full rounded-[9px] border border-border-default bg-white py-2 pl-2.5 pr-7 text-[13.5px] font-semibold text-text-primary outline-none focus:border-accent disabled:opacity-70"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-tertiary">
                            €
                          </span>
                        </label>
                        <button
                          type="button"
                          title="Auf Standard zurücksetzen"
                          disabled={!isAdmin || !hasOverride}
                          onClick={() => resetObjekt(o.id)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-[9px] border border-border-default text-text-tertiary transition-colors",
                            hasOverride
                              ? "hover:border-accent/40 hover:text-accent"
                              : "opacity-40"
                          )}
                        >
                          <span className="text-[15px]" aria-hidden>
                            ↺
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </EinstellungenCard>

      <EinstellungenCard title={EINSTELLUNGEN_ANGEBOT_FREIGABE_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            {EINSTELLUNGEN_ANGEBOT_FREIGABE_INTRO}
          </p>
          <div className="flex flex-col gap-2">
            <EinstellungenChoiceCard
              selected={behandlung === "freigabe"}
              disabled={!isAdmin}
              title="Freigabe erforderlich"
              description="Angebote über der Schwelle geben Sie manuell frei."
              onSelect={() => onBehandlungChange("freigabe")}
            />
            <EinstellungenChoiceCard
              selected={behandlung === "direkt"}
              disabled={!isAdmin}
              title="Automatisch beauftragen"
              description="Alle Angebote werden ohne Freigabe direkt beauftragt."
              onSelect={() => onBehandlungChange("direkt")}
            />
            <EinstellungenChoiceCard
              selected={behandlung === "notfall"}
              disabled={!isAdmin}
              title="Nur Notfälle automatisch"
              description="Normale Angebote freigeben — Notfälle starten sofort."
              onSelect={() => onBehandlungChange("notfall")}
            />
          </div>
        </div>
      </EinstellungenCard>
    </div>
  );
}
