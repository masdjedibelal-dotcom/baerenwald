"use server";

import { revalidatePath } from "next/cache";

import type {
  MeldeUrsachenBereich,
  MeldeUrsachenCheckState,
} from "@/lib/org/melde-ursachen";
import type { BaumUrsacheId } from "@/lib/org/melde-ursachen-baum";
import type { DachUrsacheId } from "@/lib/org/melde-ursachen-dach";
import type { FensterUrsacheId } from "@/lib/org/melde-ursachen-fenster";
import type { HeizungUrsacheId } from "@/lib/org/melde-ursachen-heizung";
import type { SchimmelUrsacheId } from "@/lib/org/melde-ursachen-schimmel";
import type { SonstigesUrsacheId } from "@/lib/org/melde-ursachen-sonstiges";
import type { StromUrsacheId } from "@/lib/org/melde-ursachen-strom";
import type { WasserUrsacheId } from "@/lib/org/melde-ursachen-wasser";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type SaveMeldeUrsachenResult =
  | { ok: true }
  | { ok: false; error: string };

const OK_BEREICHE: MeldeUrsachenBereich[] = [
  "wasser",
  "heizung",
  "strom",
  "fenster_tuer",
  "dach",
  "baum_notfall",
  "schimmel",
  "sonstiges",
];

export async function saveMeldeUrsachenCheck(input: {
  leadId: string;
  bereich: MeldeUrsachenBereich;
  selectedUrsacheId: string | null;
  sonstigesText?: string | null;
  entscheidung: "hm_geloest" | "fachfirma" | null;
  material?: string[];
}): Promise<SaveMeldeUrsachenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const write = requireOrgWrite(session);
  if (!write.ok) return { ok: false, error: write.error };

  const leadId = input.leadId.trim();
  if (!leadId) return { ok: false, error: "Vorgang fehlt." };
  if (!input.entscheidung) {
    return { ok: false, error: "Bitte Entscheidung wählen." };
  }
  if (!input.selectedUrsacheId) {
    return { ok: false, error: "Bitte Ursache wählen." };
  }
  if (!OK_BEREICHE.includes(input.bereich)) {
    return { ok: false, error: "Bereich nicht unterstützt." };
  }

  const orgId = session.kunde.id;
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select("id, funnel_daten, auftraggeber_kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr || !lead || lead.auftraggeber_kunde_id !== orgId) {
    return { ok: false, error: "Vorgang nicht gefunden." };
  }

  const prev =
    lead.funnel_daten && typeof lead.funnel_daten === "object"
      ? (lead.funnel_daten as Record<string, unknown>)
      : {};

  const common = {
    selectedUrsacheId: input.selectedUrsacheId,
    sonstigesText: input.sonstigesText?.trim() || null,
    entscheidung: input.entscheidung,
    material:
      input.entscheidung === "hm_geloest" ? input.material ?? [] : undefined,
    updatedAt: new Date().toISOString(),
  };

  let ursachen_check: MeldeUrsachenCheckState;
  if (input.bereich === "sonstiges") {
    ursachen_check = {
      bereich: "sonstiges",
      selectedUrsacheId: common.selectedUrsacheId as SonstigesUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "schimmel") {
    ursachen_check = {
      bereich: "schimmel",
      selectedUrsacheId: common.selectedUrsacheId as SchimmelUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "baum_notfall") {
    ursachen_check = {
      bereich: "baum_notfall",
      selectedUrsacheId: common.selectedUrsacheId as BaumUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "dach") {
    ursachen_check = {
      bereich: "dach",
      selectedUrsacheId: common.selectedUrsacheId as DachUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "fenster_tuer") {
    ursachen_check = {
      bereich: "fenster_tuer",
      selectedUrsacheId: common.selectedUrsacheId as FensterUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "strom") {
    ursachen_check = {
      bereich: "strom",
      selectedUrsacheId: common.selectedUrsacheId as StromUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else if (input.bereich === "heizung") {
    ursachen_check = {
      bereich: "heizung",
      selectedUrsacheId: common.selectedUrsacheId as HeizungUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  } else {
    ursachen_check = {
      bereich: "wasser",
      selectedUrsacheId: common.selectedUrsacheId as WasserUrsacheId,
      sonstigesText: common.sonstigesText,
      entscheidung: common.entscheidung,
      material: common.material,
      updatedAt: common.updatedAt,
    };
  }

  const { error } = await supabaseAdmin
    .from("leads")
    .update({
      funnel_daten: {
        ...prev,
        ursachen_check,
      },
    })
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal");
  return { ok: true };
}
