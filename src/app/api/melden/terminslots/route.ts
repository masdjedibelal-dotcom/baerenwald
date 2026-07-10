import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  token?: string;
  slotId?: string;
  action?: "bestaetigen" | "absagen";
  absageGrund?: string;
};

async function leadFromToken(token: string) {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("melde_tracking_token", token)
    .maybeSingle();
  return lead;
}

/** Terminvorschläge für Mieter-Statusseite. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token fehlt." }, { status: 400 });
  }

  const lead = await leadFromToken(token);
  if (!lead) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!auftrag) {
    return NextResponse.json({ slots: [], bestaetigt: null });
  }

  const { data: slots } = await supabaseAdmin
    .from("auftrag_terminslots")
    .select("id, slot_beginn, slot_ende, status, bestaetigt_am")
    .eq("auftrag_id", auftrag.id)
    .in("status", ["vorgeschlagen", "bestaetigt"])
    .order("slot_beginn", { ascending: true });

  const bestaetigt =
    slots?.find((s) => s.status === "bestaetigt") ??
    null;

  return NextResponse.json({ slots: slots ?? [], bestaetigt });
}

/** Mieter bestätigt oder lehnt Terminvorschlag ab. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const slotId = String(body.slotId ?? "").trim();
  const action = body.action;

  if (!token || !slotId || (action !== "bestaetigen" && action !== "absagen")) {
    return NextResponse.json({ error: "Ungültige Parameter." }, { status: 400 });
  }

  const lead = await leadFromToken(token);
  if (!lead) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { data: slot } = await supabaseAdmin
    .from("auftrag_terminslots")
    .select("id, auftrag_id, status")
    .eq("id", slotId)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("id", slot.auftrag_id)
    .eq("lead_id", lead.id)
    .maybeSingle();

  if (!auftrag) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (action === "bestaetigen") {
    await supabaseAdmin
      .from("auftrag_terminslots")
      .update({ status: "abgesagt", abgesagt_am: now, absage_grund: "durch anderen Slot ersetzt" })
      .eq("auftrag_id", slot.auftrag_id)
      .eq("status", "bestaetigt");

    const { error } = await supabaseAdmin
      .from("auftrag_terminslots")
      .update({ status: "bestaetigt", bestaetigt_am: now })
      .eq("id", slotId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "bestaetigt" });
  }

  const grund = String(body.absageGrund ?? "").trim() || "Mieter abgesagt";
  const { error } = await supabaseAdmin
    .from("auftrag_terminslots")
    .update({ status: "abgesagt", abgesagt_am: now, absage_grund: grund })
    .eq("id", slotId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "abgesagt" });
}
