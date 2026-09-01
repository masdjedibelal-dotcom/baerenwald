"use client";

import {
  acceptKundeAngebot,
  rejectKundeAngebot,
} from "@/app/actions/portal-angebot";
import { acceptKundeAuftragAenderungen } from "@/app/actions/portal-auftrag";
import { track } from "@/lib/analytics";
import type {
  PortalDashboardActionButton,
  PortalDashboardActionSlide,
} from "@/lib/portal2/dashboard-actions/types";
import { kundePortalToast, orgPortalToast } from "@/lib/shared/portal-toast";

export async function runPortalDashboardInlineAction(input: {
  slide: PortalDashboardActionSlide;
  buttonId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { slide, buttonId } = input;
  const leadId = slide.payload?.leadId ?? slide.leadId ?? slide.openId;

  switch (slide.kind) {
    case "hv_meldung": {
      const aktion = buttonId as
        | "ablehnen"
        | "hm_begutachten"
        | "direkt_baerenwald";
      const res = await fetch("/api/org/meldung-aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, aktion }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: json.error ?? "Aktion fehlgeschlagen." };
      }
      if (aktion === "hm_begutachten") orgPortalToast.hmBegutachten();
      else if (aktion === "ablehnen") orgPortalToast.meldungAbgelehnt();
      else orgPortalToast.angebotEingefordert();
      return { ok: true };
    }

    case "hv_angebot_freigabe": {
      const aktion = buttonId as "freigegeben" | "abgelehnt";
      const res = await fetch("/api/org/freigabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, aktion }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: json.error ?? "Aktion fehlgeschlagen." };
      }
      track.orgFreigabe(aktion);
      if (aktion === "freigegeben") orgPortalToast.freigegeben();
      else orgPortalToast.freigabeAbgelehnt();
      return { ok: true };
    }

    case "kunde_angebot": {
      const angebotId = slide.payload?.angebotId ?? slide.openId;
      if (buttonId === "annehmen") {
        const res = await acceptKundeAngebot(angebotId);
        if (!res.ok) return { ok: false, error: res.error };
        kundePortalToast.angebotAngenommen();
        return { ok: true };
      }
      if (buttonId === "ablehnen") {
        const res = await rejectKundeAngebot(angebotId);
        if (!res.ok) return { ok: false, error: res.error };
        kundePortalToast.angebotAbgelehnt();
        return { ok: true };
      }
      return { ok: false, error: "Unbekannte Aktion." };
    }

    case "kunde_auftrag_aenderung": {
      const auftragId = slide.payload?.auftragId ?? slide.openId;
      if (buttonId === "annehmen") {
        const res = await acceptKundeAuftragAenderungen(auftragId);
        if (!res.ok) return { ok: false, error: res.error };
        kundePortalToast.aenderungenAngenommen();
        return { ok: true };
      }
      return { ok: false, error: "Unbekannte Aktion." };
    }

    default:
      return { ok: false, error: "Aktion nur im Vorgang möglich." };
  }
}

export function dashboardButtonOpensDetail(
  button: PortalDashboardActionButton
): boolean {
  return button.mode === "open";
}
