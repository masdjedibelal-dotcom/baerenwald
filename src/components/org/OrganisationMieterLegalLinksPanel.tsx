"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  EinstellungenCard,
  EinstellungenEdField,
  EinstellungenInfoBox,
} from "@/components/shared/PortalEinstellungenUi";
import {
  meldeDatenschutzUrl,
  meldeImpressumUrl,
} from "@/lib/org/melde-legal-urls";
import type { OrganisationKunde } from "@/lib/org/types";
import { portalOrigin } from "@/lib/org/melde-url";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

type Props = {
  kunde: OrganisationKunde;
  readOnly?: boolean;
  onSaved: () => void;
};

type Draft = {
  impressum: string;
  datenschutz: string;
};

function draftFromKunde(kunde: OrganisationKunde): Draft {
  return {
    impressum: kunde.impressum_url?.trim() ?? "",
    datenschutz: kunde.datenschutz_url?.trim() ?? "",
  };
}

/** Leer oder absolute http(s)-URL. */
function normalizeLegalUrl(raw: string): string | null | "invalid" {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "invalid";
    return u.toString();
  } catch {
    return "invalid";
  }
}

/**
 * HV-Einstellungen: optionale eigene Impressum-/Datenschutz-Links für den Mieter-Funnel.
 * Leer = org-spezifische Melde-Routen als Fallback.
 */
export function OrganisationMieterLegalLinksPanel({
  kunde,
  readOnly = false,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromKunde(kunde));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(draftFromKunde(kunde));
    setError(null);
  }, [kunde]);

  const orgKennung = kunde.org_kennung?.trim() ?? "";
  const fallbackImpressum = orgKennung
    ? `${portalOrigin({ forPrint: true })}${meldeImpressumUrl(orgKennung)}`
    : null;
  const fallbackDatenschutz = orgKennung
    ? `${portalOrigin({ forPrint: true })}${meldeDatenschutzUrl(orgKennung)}`
    : null;

  const persist = useCallback(
    async (next: Draft) => {
      if (readOnly) return;
      const impressum = normalizeLegalUrl(next.impressum);
      const datenschutz = normalizeLegalUrl(next.datenschutz);
      if (impressum === "invalid" || datenschutz === "invalid") {
        setError(
          "Bitte vollständige Links mit https:// eingeben — oder Felder leer lassen."
        );
        return;
      }
      setError(null);
      setSaving(true);
      try {
        const res = await fetch("/api/org/branding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            impressum_url: impressum,
            datenschutz_url: datenschutz,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Links nicht gespeichert", json.error);
          return;
        }
        orgPortalToast.saved();
        onSaved();
      } finally {
        setSaving(false);
      }
    },
    [onSaved, readOnly]
  );

  const scheduleSave = useCallback(
    (next: Draft) => {
      setDraft(next);
      if (readOnly) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void persist(next);
      }, 650);
    },
    [persist, readOnly]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <EinstellungenCard title="Impressum & Datenschutz (Mieter)">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
          Diese Links erscheinen im Footer der Schadensmeldung. Leer lassen,
          wenn die Standardseiten der Melde-Strecke genutzt werden sollen.
        </p>

        <EinstellungenInfoBox>
          {fallbackImpressum && fallbackDatenschutz ? (
            <>
              Ohne eigene Links gilt der Fallback:{" "}
              <span className="break-all font-semibold">{fallbackImpressum}</span>{" "}
              und{" "}
              <span className="break-all font-semibold">
                {fallbackDatenschutz}
              </span>
              .
            </>
          ) : (
            <>
              Ohne eigene Links und ohne Organisations-Kennung greifen die
              zentralen Bärenwald-Seiten. Bitte Bärenwald kontaktieren, falls
              die Kennung fehlt.
            </>
          )}
        </EinstellungenInfoBox>

        <EinstellungenEdField
          label="Impressum-URL"
          value={draft.impressum}
          disabled={readOnly}
          placeholder={
            fallbackImpressum ?? "https://ihre-verwaltung.de/impressum"
          }
          onChange={(v) => scheduleSave({ ...draft, impressum: v })}
        />
        <EinstellungenEdField
          label="Datenschutz-URL"
          value={draft.datenschutz}
          disabled={readOnly}
          placeholder={
            fallbackDatenschutz ?? "https://ihre-verwaltung.de/datenschutz"
          }
          onChange={(v) => scheduleSave({ ...draft, datenschutz: v })}
        />

        {error ? (
          <p className="text-[12.5px] font-medium text-red-700">{error}</p>
        ) : null}
        {saving ? (
          <p className="text-[11.5px] text-text-tertiary">Speichern…</p>
        ) : null}
      </div>
    </EinstellungenCard>
  );
}
