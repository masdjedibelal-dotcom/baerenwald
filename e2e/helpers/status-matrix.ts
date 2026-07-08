import type { Page } from "@playwright/test";

import { leadById } from "./db";

type MieterStufe = "eingegangen" | "in_bearbeitung" | "beauftragt" | "erledigt";

function resolveMieterStufe(lead: {
  hv_meldung_status?: string | null;
  vorgang_phase?: string | null;
  org_freigabe_status?: string | null;
}): MieterStufe {
  const phase = (lead.vorgang_phase ?? "").trim();
  if (phase === "abgeschlossen") return "erledigt";
  if (phase === "beauftragt" || phase === "abnahme") return "beauftragt";
  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgeschlossen" || hv === "abgelehnt") return "erledigt";
  if (hv === "notmassnahme" || hv === "kleinreparatur") return "in_bearbeitung";
  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (freigabe === "freigegeben") return "in_bearbeitung";
  return "eingegangen";
}

export type StatusSnapshot = {
  mieterStufe: string;
  mieterLabel: string;
  hvMeldungStatus: string | null;
  orgFreigabe: string | null;
  vorgangPhase: string | null;
};

export async function snapshotLeadStatus(leadId: string): Promise<StatusSnapshot> {
  const lead = await leadById(leadId);
  if (!lead) throw new Error(`Lead ${leadId} nicht gefunden`);
  const stufe = resolveMieterStufe(lead);
  return {
    mieterStufe: stufe,
    mieterLabel: stufe,
    hvMeldungStatus: (lead.hv_meldung_status as string) ?? null,
    orgFreigabe: (lead.org_freigabe_status as string) ?? null,
    vorgangPhase: (lead.vorgang_phase as string) ?? null,
  };
}

/** TC-10: Inkonsistenz = harter Fehler (kein Warn-Log). */
export function assertTc10Step(
  step: string,
  snap: StatusSnapshot,
  expected: Partial<StatusSnapshot>
) {
  const checks: Array<[keyof StatusSnapshot, string]> = [
    ["mieterStufe", "Mieter-Stufe"],
    ["hvMeldungStatus", "HV-Meldung"],
    ["orgFreigabe", "Org-Freigabe"],
    ["vorgangPhase", "Vorgang-Phase"],
  ];
  for (const [key, label] of checks) {
    const exp = expected[key];
    if (exp === undefined) continue;
    const got = snap[key];
    if (got !== exp) {
      throw new Error(
        `TC-10 Schritt ${step}: ${label} inkonsistent — erwartet "${exp}", got "${got}" (${JSON.stringify(snap)})`
      );
    }
  }
}

/** TC-10 nach jedem TC-01-Schritt aufrufen. */
export async function assertTc10AfterStep(
  leadId: string,
  step: string,
  expected: Partial<StatusSnapshot>
) {
  const snap = await snapshotLeadStatus(leadId);
  assertTc10Step(step, snap, expected);
}

export function assertStatusConsistent(
  snapshots: StatusSnapshot[],
  expectedMieterStufe: string
) {
  for (const s of snapshots) {
    if (s.mieterStufe !== expectedMieterStufe) {
      throw new Error(
        `Inkonsistenz: erwartet Mieter-Stufe ${expectedMieterStufe}, got ${s.mieterStufe} (${JSON.stringify(s)})`
      );
    }
  }
}

export async function assertMieterStatusPage(
  page: Page,
  token: string,
  expectedLabel: RegExp
) {
  await page.goto(`/melden/status/${token}`);
  await page.getByText(expectedLabel).waitFor({ state: "visible", timeout: 15_000 });
}
