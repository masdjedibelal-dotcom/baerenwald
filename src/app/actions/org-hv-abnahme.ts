"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrganisationSession } from "@/lib/org/require-org-session";

export type HvAbnahmeArt = "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";

export async function submitOrgHvAbnahme(input: {
  leadId: string;
  auftragId: string;
  art: HvAbnahmeArt;
  anmerkung?: string;
  signiertName: string;
  signaturPng?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const kunde = session.kunde;

  if (input.art === "zurueckgewiesen") {
    if (!input.anmerkung?.trim()) {
      return { ok: false, error: "Bitte Begründung angeben." };
    }
  } else {
    if (!input.signaturPng?.trim()) {
      return { ok: false, error: "Bitte unterschreiben." };
    }
    if (!input.signiertName.trim()) {
      return { ok: false, error: "Bitte Name angeben." };
    }
    if (input.art === "mit_anmerkung" && !input.anmerkung?.trim()) {
      return { ok: false, error: "Bitte Anmerkung angeben." };
    }
  }

  const supabase = await createClient();

  const { data: auftrag, error: auftragErr } = await supabase
    .from("auftraege")
    .select("id, lead_id, kunde_id")
    .eq("id", input.auftragId)
    .eq("kunde_id", kunde.id)
    .maybeSingle();

  if (auftragErr || !auftrag) {
    return { ok: false, error: "Auftrag nicht gefunden." };
  }

  const { error } = await supabase.from("hv_portal_abnahmen").upsert(
    {
      auftrag_id: input.auftragId,
      lead_id: input.leadId,
      kunde_id: kunde.id,
      art: input.art,
      anmerkung: input.anmerkung?.trim() || null,
      signatur_png: input.signaturPng ?? null,
      signiert_name: input.signiertName.trim() || "Hausverwaltung",
      signiert_am: new Date().toISOString(),
    },
    { onConflict: "auftrag_id" }
  );

  if (error) {
    console.error("[org-hv-abnahme]", error.message);
    return { ok: false, error: "Speichern fehlgeschlagen." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
