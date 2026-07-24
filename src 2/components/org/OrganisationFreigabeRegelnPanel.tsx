"use client";

import { useEffect, useRef, useState } from "react";

import {
  EinstellungenCard,
  EinstellungenEuroSlider,
  EinstellungenInfoBox,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
  EINSTELLUNGEN_AKUT_TITLE,
  EINSTELLUNGEN_KLEINREPARATUR_TITLE,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  einstellungenSchwelleInfo,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  isAdmin?: boolean;
};

/**
 * Freigabe-Regeln: Freigabebetrag + Kleinreparatur + Akut.
 * Default: oberhalb der Schwelle (und außerhalb Akut) immer HV-Freigabe
 * bevor an Bärenwald weitergeleitet wird.
 */
export function OrganisationFreigabeRegelnPanel({
  kunde,
  onSaved,
  isAdmin = true,
}: Props) {
  const [schwelle, setSchwelle] = useState(() =>
    snapEinstellungenSchwelle(
      kunde.freigabe_schwelle_eur != null
        ? Number(kunde.freigabe_schwelle_eur)
        : 500
    )
  );
  const [kleinAktiv, setKleinAktiv] = useState(
    kunde.kleinreparatur_aktiv === true
  );
  const [akutDirekt, setAkutDirekt] = useState(kunde.notfall_direkt !== false);
  const schwelleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migratedModus = useRef(false);

  useEffect(() => {
    setSchwelle(
      snapEinstellungenSchwelle(
        kunde.freigabe_schwelle_eur != null
          ? Number(kunde.freigabe_schwelle_eur)
          : 500
      )
    );
    setKleinAktiv(kunde.kleinreparatur_aktiv === true);
    setAkutDirekt(kunde.notfall_direkt !== false);
  }, [
    kunde.freigabe_schwelle_eur,
    kunde.kleinreparatur_aktiv,
    kunde.notfall_direkt,
  ]);

  useEffect(() => {
    return () => {
      if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    };
  }, []);

  /** Alte „direkt“-Einstellung still auf Freigabe stellen (ohne Toast). */
  useEffect(() => {
    if (!isAdmin || migratedModus.current) return;
    if (kunde.freigabe_modus !== "direkt") return;
    migratedModus.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/org/einstellungen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ freigabe_modus: "freigabe" }),
        });
        if (res.ok) onSaved();
      } catch {
        /* ignore */
      }
    })();
  }, [isAdmin, kunde.freigabe_modus, onSaved]);

  const patchEinstellungen = async (body: Record<string, unknown>) => {
    if (!isAdmin) return false;
    try {
      const res = await fetch("/api/org/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          freigabe_modus: "freigabe",
        }),
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
  const onSchwelleChange = (raw: number) => {
    const value = snapEinstellungenSchwelle(raw);
    setSchwelle(value);
    if (!isAdmin) return;
    if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    schwelleTimer.current = setTimeout(() => {
      void patchEinstellungen({ freigabe_schwelle_eur: value });
    }, 450);
  };

  const onKleinAktivChange = (checked: boolean) => {
    setKleinAktiv(checked);
    void patchEinstellungen({
      kleinreparatur_aktiv: checked,
      ...(checked ? { kleinreparatur_schwelle_eur: schwelle } : {}),
    });
  };

  const onAkutChange = (checked: boolean) => {
    setAkutDirekt(checked);
    void patchEinstellungen({ notfall_direkt: checked });
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p
              className="text-[13px] leading-[1.55]"
              style={{ color: PORTAL_C.sub }}
            >
              {EINSTELLUNGEN_SCHWELLE_INTRO}
            </p>
            <EinstellungenEuroSlider
              value={schwelle}
              disabled={!isAdmin}
              min={EINSTELLUNGEN_SCHWELLE_SLIDER_MIN}
              max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
              step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
              formatValue={formatEinstellungenSchwelle}
              onChange={onSchwelleChange}
            />
            <EinstellungenInfoBox>
              {einstellungenSchwelleInfo(schwelle)}
            </EinstellungenInfoBox>
          </div>

          <div className="border-t border-border-light pt-4">
            <EinstellungenToggle
              checked={kleinAktiv}
              disabled={!isAdmin}
              onChange={onKleinAktivChange}
              title={EINSTELLUNGEN_KLEINREPARATUR_TITLE}
              description={
                kleinAktiv
                  ? `Aktiv bis ${formatEinstellungenSchwelle(schwelle)} — ohne Angebot sofort reparieren.`
                  : "Deaktiviert — jede Reparatur braucht ein Angebot."
              }
            />
          </div>

          <div className="border-t border-border-light pt-4">
            <p
              className="mb-2.5 text-[13px] leading-[1.55]"
              style={{ color: PORTAL_C.sub }}
            >
              {EINSTELLUNGEN_AKUT_INTRO}
            </p>
            <EinstellungenToggle
              checked={akutDirekt}
              disabled={!isAdmin}
              onChange={onAkutChange}
              title={EINSTELLUNGEN_AKUT_TITLE}
              description={
                akutDirekt
                  ? "Ja — bei akuten Schäden darf sofort beauftragt werden."
                  : "Nein — auch akute Schäden brauchen Ihre Freigabe, bevor an Bärenwald weitergeleitet wird."
              }
            />
          </div>
        </div>
      </EinstellungenCard>
    </div>
  );
}
