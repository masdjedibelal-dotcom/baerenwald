"use server";

import { revalidatePath } from "next/cache";

import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from "@/lib/partner/handwerker-ablehnung";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { sendPartnerInternalAnfrageAntwortMail } from "@/lib/partner/partner-mail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAnfrageAntwortResult =
  | { ok: true }
  | { ok: false; error: string };

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

export async function respondPartnerAnfrage(opts: {
  anfrageId: string;
  antwort: "akzeptiert" | "abgelehnt";
  grund?: string;
  notiz?: string;
}): Promise<PartnerAnfrageAntwortResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const grundRaw = opts.grund?.trim() ?? "";
  if (opts.antwort === "abgelehnt") {
    if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
      return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      angebot_id,
      handwerker_id,
      antwort_at,
      status,
      handwerker(name),
      gewerke(name)
    `
    )
    .eq("id", opts.anfrageId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Anfrage nicht gefunden." };
  }

  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung für diese Anfrage." };
  }

  if (row.antwort_at) {
    return { ok: false, error: "Du hast bereits geantwortet." };
  }

  const newStatus = opts.antwort === "akzeptiert" ? "akzeptiert" : "abgelehnt";
  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;
  const ablehnungGrundDb =
    opts.antwort === "abgelehnt" && isHandwerkerAblehnungGrund(grundRaw)
      ? grundRaw
      : null;

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      status: newStatus,
      antwort_at: now,
      antwort_notiz: notiz,
      ablehnung_grund: ablehnungGrundDb,
      hw_status: opts.antwort === "akzeptiert" ? "offen" : null,
    })
    .eq("id", opts.anfrageId)
    .is("antwort_at", null);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const raw = row as Record<string, unknown>;
  const hw = one(raw.handwerker) as { name: string } | null;
  const gw = one(raw.gewerke) as { name: string } | null;
  const grundLabel =
    ablehnungGrundDb && isHandwerkerAblehnungGrund(ablehnungGrundDb)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[ablehnungGrundDb]
      : null;

  await sendPartnerInternalAnfrageAntwortMail({
    handwerkerName: hw?.name?.trim() || "Partner",
    gewerkName: gw?.name?.trim() || "Gewerk",
    angenommen: opts.antwort === "akzeptiert",
    ablehnungGrundLabel: grundLabel,
    notiz,
    angebotId: String(raw.angebot_id),
  });

  revalidatePath("/partner");

  return { ok: true };
}
