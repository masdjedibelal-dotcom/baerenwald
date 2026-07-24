"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalPushPermissionRationale } from "@/components/shared/PortalPushPermissionRationale";
import { PortalTrackingConsentPanel } from "@/components/shared/PortalTrackingConsentPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenEdField,
  EinstellungenPfRow,
} from "@/components/shared/PortalEinstellungenUi";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { portalKundeTypRoleLabel } from "@/lib/portal2/kunde-typ";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

type Props = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
};

/**
 * D12 Privat/Gewerbe — Einstellungen inkl. Profil-Edit + Konto-Sicherheit.
 */
export function PortalEinstellungenPrivat({
  name,
  email,
  telefon,
  kundeTyp,
}: Props) {
  const router = useRouter();
  const [editName, setEditName] = useState(name?.trim() || "");
  const [editTel, setEditTel] = useState(telefon?.trim() || "");
  const [busy, setBusy] = useState(false);

  async function saveProfil() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, telefon: editTel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        portalToastError(json.error || "Speichern fehlgeschlagen.");
        return;
      }
      portalToastSuccess("Profil gespeichert.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PortalEinstellungenShell
        variant="privat"
        eyebrow={portalKundeTypRoleLabel(kundeTyp)}
      >
        {() => (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <h3
                className="text-sm font-bold"
                style={{
                  color: PORTAL_VAR.ink,
                  fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                }}
              >
                Profil
              </h3>
              <EinstellungenEdField
                label="Name"
                value={editName}
                onChange={setEditName}
                autoComplete="name"
              />
              <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
              <p className="text-[11.5px] text-text-tertiary">
                E-Mail-Änderung nur über Support (Verifizierung).
              </p>
              <EinstellungenEdField
                label="Telefon"
                value={editTel}
                onChange={setEditTel}
                type="tel"
                autoComplete="tel"
              />
              <button
                type="button"
                className="btn-pill-outline portal-btn-compact"
                disabled={busy || editName.trim().length < 2}
                onClick={() => void saveProfil()}
              >
                {busy ? "Speichern…" : "Profil speichern"}
              </button>
            </div>

            <PortalKontoSicherheitPanel signOutHref="/portal/login" />
            <PortalPushPermissionRationale role="kunde" embedded />
            <PortalTrackingConsentPanel />
          </div>
        )}
      </PortalEinstellungenShell>

      <div className="px-4 lg:px-6">
        <form action="/portal/auth/signout" method="post">
          <button type="submit" className="btn-pill-outline w-full">
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
