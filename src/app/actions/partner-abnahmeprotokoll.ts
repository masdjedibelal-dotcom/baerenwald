"use server";

import { revalidatePath } from "next/cache";

import { notifyHvPartnerErledigt } from "@/lib/org/notify-hv-partner-erledigt";
import { generateAbnahmeprotokollPdf } from "@/lib/partner/generate-abnahmeprotokoll-pdf";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
} from "@/lib/partner/partner-konditionen";
import { submitCrmAbnahmeprotokoll } from "@/lib/partner/partner-crm-api";
import { sendPartnerInternalErledigtMail } from "@/lib/partner/partner-mail";
import { uploadAbnahmeProtokollPdf } from "@/lib/partner/partner-storage";
import { allePositionenPortalErledigt } from "@/lib/portal/vorgang-erledigt";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAbnahmeprotokollInput = {
  auftragId: string;
  protokollText: string;
  maengelText?: string;
  ort: string;
  abnahmeDatum: string;
  hwUnterschriftName: string;
  kundeUnterschriftName: string;
  /** D11 Canvas PNG (data URL). */
  hwSignaturPng?: string;
  kundeSignaturPng?: string;
  abschlussChecks?: Record<string, boolean>;
};

export type PartnerAbnahmeprotokollResult =
  | { ok: true; vollstaendig: boolean }
  | { ok: false; error: string };

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  const { data: hw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  if (hw?.length) return true;

  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  return Boolean(pos?.length);
}

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false as const, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false as const, error: link.error };
  }

  return { ok: true as const, handwerkerId: link.handwerkerId };
}

function validateInput(input: PartnerAbnahmeprotokollInput): string | null {
  if (!input.protokollText.trim()) return "Protokolltext fehlt.";
  if (!input.ort.trim()) return "Ort fehlt.";
  if (!input.abnahmeDatum.trim()) return "Abnahmedatum fehlt.";
  if (!input.hwUnterschriftName.trim()) return "Unterschrift Handwerker fehlt.";
  if (!input.kundeUnterschriftName.trim()) return "Unterschrift Kunde fehlt.";
  if (input.hwUnterschriftName.trim().length < 3) {
    return "Bitte den vollen Namen des Handwerkers ausschreiben.";
  }
  if (input.kundeUnterschriftName.trim().length < 3) {
    return "Bitte den vollen Namen des Kunden ausschreiben.";
  }
  if (!input.hwSignaturPng?.trim()) {
    return "Bitte die Handwerker-Signatur zeichnen.";
  }
  return null;
}

/** Abnahmeprotokoll ausfüllen + Leistungen als erledigt melden. */
export async function submitPartnerAbnahmeprotokoll(
  input: PartnerAbnahmeprotokollInput
): Promise<PartnerAbnahmeprotokollResult> {
  const id = input.auftragId.trim();
  if (!id) return { ok: false, error: "Auftrag fehlt." };

  const validationErr = validateInput(input);
  if (validationErr) return { ok: false, error: validationErr };

  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, lead_id")
    .eq("id", id)
    .maybeSingle();

  if (!auftrag) return { ok: false, error: "Auftrag nicht gefunden." };

  const st = String(auftrag.status ?? "").toLowerCase();
  if (st === "abgeschlossen" || st === "storniert" || st === "abgelehnt") {
    return { ok: false, error: "Auftrag ist bereits abgeschlossen." };
  }

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, leistung_name, handwerker_status")
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId);

  const zuErledigen = (positionen ?? []).filter(
    (p) =>
      positionHandwerkerAbgeschlossen(p.handwerker_status) &&
      !positionHandwerkerErledigt(p.handwerker_status)
  );

  if (!zuErledigen.length) {
    return {
      ok: false,
      error: "Keine offenen Leistungen zum Abschließen vorhanden.",
    };
  }

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name, firma")
    .eq("id", auth.handwerkerId)
    .maybeSingle();

  const handwerkerName = hw?.firma?.trim() || hw?.name?.trim() || "Handwerker";
  const leistungen = zuErledigen
    .map((p) => String(p.leistung_name ?? "Leistung").trim())
    .filter(Boolean);

  const pdfBytes = await generateAbnahmeprotokollPdf({
    auftragTitel: String(auftrag.titel ?? "Auftrag"),
    handwerkerName,
    leistungen,
    protokollText: input.protokollText.trim(),
    maengelText: input.maengelText?.trim() || null,
    ort: input.ort.trim(),
    abnahmeDatum: input.abnahmeDatum.trim(),
    hwUnterschriftName: input.hwUnterschriftName.trim(),
    kundeUnterschriftName: input.kundeUnterschriftName.trim(),
  });

  const upload = await uploadAbnahmeProtokollPdf({
    handwerkerId: auth.handwerkerId,
    auftragId: id,
    pdfBytes,
  });

  if (!upload.ok) return upload;

  const now = new Date().toISOString();
  const abnahmeDatum = input.abnahmeDatum.trim().slice(0, 10);
  const leadId = auftrag.lead_id ? String(auftrag.lead_id) : null;

  const protoBase = {
    auftrag_id: id,
    handwerker_id: auth.handwerkerId,
    lead_id: leadId,
    protokoll_text: input.protokollText.trim(),
    maengel_text: input.maengelText?.trim() || null,
    ort: input.ort.trim(),
    abnahme_datum: abnahmeDatum,
    hw_unterschrift_name: input.hwUnterschriftName.trim(),
    kunde_unterschrift_name: input.kundeUnterschriftName.trim(),
    pdf_path: upload.path,
    created_at: now,
  };

  const protoWithSig = {
    ...protoBase,
    hw_signatur_png: input.hwSignaturPng!.trim(),
    hw_signiert_am: now,
    kunde_signatur_png: input.kundeSignaturPng?.trim() || null,
    kunde_signiert_am: input.kundeSignaturPng?.trim() ? now : null,
  };

  let protoErr = (
    await supabaseAdmin.from("abnahme_protokolle").insert(protoWithSig)
  ).error;

  if (protoErr && /hw_signatur|kunde_signatur|signiert_am/i.test(protoErr.message)) {
    // Migration noch nicht applied: ohne Signatur-Spalten speichern
    protoErr = (
      await supabaseAdmin.from("abnahme_protokolle").insert(protoBase)
    ).error;
  }

  if (protoErr) {
    console.error("[submitPartnerAbnahmeprotokoll] insert:", protoErr.message);
    return { ok: false, error: "Abnahmeprotokoll konnte nicht gespeichert werden." };
  }

  const ids = zuErledigen.map((p) => String(p.id));
  // auftrag_positionen hat kein updated_at — nur Status-Felder patchen
  let { error: updateErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      handwerker_status: "erledigt",
      leistung_status: "erledigt",
    })
    .in("id", ids);

  if (updateErr && /leistung_status/i.test(updateErr.message)) {
    ({ error: updateErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .update({ handwerker_status: "erledigt" })
      .in("id", ids));
  }

  if (updateErr) {
    console.error("[submitPartnerAbnahmeprotokoll] positionen:", updateErr.message);
    return { ok: false, error: "Leistungen konnten nicht aktualisiert werden." };
  }

  const { data: allePositionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("handwerker_id, handwerker_status, leistung_status, aenderung_typ")
    .eq("auftrag_id", id);

  const auftragVollstaendigErledigt = allePositionenPortalErledigt(
    allePositionen ?? []
  );

  const auftragPatchFull: Record<string, unknown> = {
    abnahme_protokoll_url: upload.path,
    abnahme_datum: abnahmeDatum,
    updated_at: now,
    hw_abschluss_signiert_am: now,
    ...(auftragVollstaendigErledigt ? { status: "abgeschlossen" } : {}),
  };
  let { error: auftragUpdErr } = await supabaseAdmin
    .from("auftraege")
    .update(auftragPatchFull)
    .eq("id", id);

  if (
    auftragUpdErr &&
    /hw_abschluss_signiert_am/i.test(auftragUpdErr.message)
  ) {
    const { hw_abschluss_signiert_am: _s, ...withoutSig } = auftragPatchFull;
    ({ error: auftragUpdErr } = await supabaseAdmin
      .from("auftraege")
      .update(withoutSig)
      .eq("id", id));
  }
  if (auftragUpdErr) {
    console.warn(
      "[submitPartnerAbnahmeprotokoll] auftrag update:",
      auftragUpdErr.message
    );
  }

  await submitCrmAbnahmeprotokoll(id, {
    protokoll_text: input.protokollText.trim(),
    maengel_text: input.maengelText?.trim() || null,
    ort: input.ort.trim(),
    abnahme_datum: abnahmeDatum,
    hw_unterschrift_name: input.hwUnterschriftName.trim(),
    kunde_unterschrift_name: input.kundeUnterschriftName.trim(),
    leistungen,
    pdf_path: upload.path,
    vollstaendig: auftragVollstaendigErledigt,
  }).then((crm) => {
    if (!crm.ok) {
      console.warn("[submitPartnerAbnahmeprotokoll] CRM:", crm.error);
    }
  });

  await sendPartnerInternalErledigtMail({
    handwerkerName,
    firma: hw?.firma,
    auftragTitel: String(auftrag.titel ?? "Auftrag"),
    auftragId: id,
    leistungen,
  });

  if (leadId) {
    await notifyHvPartnerErledigt({
      auftragId: id,
      leadId,
      handwerkerName,
      leistungen,
      vollstaendig: auftragVollstaendigErledigt,
    });
  }

  revalidatePath("/partner");
  return { ok: true, vollstaendig: auftragVollstaendigErledigt };
}
