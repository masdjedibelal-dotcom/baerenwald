import type { MeldeKategorie, OrganisationLead } from "@/lib/org/types";
import { hvMeldungStatusLabel } from "@/lib/org/hv-meldung-workflow";

export function meldeFotosFromLead(lead: OrganisationLead): string[] {
  const fd = lead.funnel_daten as { fotos?: unknown } | null | undefined;
  if (!Array.isArray(fd?.fotos)) return [];
  return fd.fotos
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, 12);
}

export function meldeKategorieFromLead(lead: OrganisationLead): MeldeKategorie | null {
  const fd = lead.funnel_daten as { melde_kategorie?: string } | null | undefined;
  const k = fd?.melde_kategorie;
  if (k === "notfall" || k === "schaden" || k === "reparatur" || k === "sonstiges") {
    return k;
  }
  return null;
}

export function meldeBereichFromLead(lead: OrganisationLead): string | null {
  const fd = lead.funnel_daten as { melde_bereich?: string } | null | undefined;
  return fd?.melde_bereich?.trim() || null;
}

export function isMeldeNotfall(lead: OrganisationLead): boolean {
  return meldeKategorieFromLead(lead) === "notfall";
}

export function eingangStatusLabel(lead: OrganisationLead): string {
  if (lead.einladung_status === "offen") return "Wartet auf Melder";
  if (lead.hv_meldung_status) {
    return hvMeldungStatusLabel(lead.hv_meldung_status);
  }
  if (lead.org_freigabe_status === "ausstehend") return "Angebot zur Freigabe";
  if (lead.org_freigabe_status === "abgelehnt") return "Abgelehnt";
  if (lead.org_freigabe_status === "freigegeben") return "Freigegeben";
  return lead.status?.trim() || "Neu";
}
