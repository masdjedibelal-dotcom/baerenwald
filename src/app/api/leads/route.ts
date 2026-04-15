import { NextResponse } from "next/server";
import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";

export type BwLeadBody = {
  name?: string;
  email?: string;
  telefon?: string;
  situation?: string | null;
  bereiche?: string[];
  priceMin?: number;
  priceMax?: number;
  plz?: string;
  zeitraum?: string | null;
  budgetCheck?: string | null;
  budgetGespraech?: boolean;
  selectedSlot?: { date: string; time: string } | null;
  photoCount?: number;
  dringlichkeit?: string | null;
  umfang?: string | null;
  kundentyp?: string | null;
  leadType?: "beratung" | "system" | "ausserhalb";
  beschreibung?: string;
};

function budgetLine(body: BwLeadBody): string {
  if (body.budgetGespraech) return "Budgetgespräch gewünscht (Rahmen zu hoch)";
  if (body.budgetCheck === "ok") return "Passt gut";
  if (body.budgetCheck === "zu_hoch") return "Eher zu hoch";
  return body.budgetCheck ?? "—";
}

function slotLine(slot: BwLeadBody["selectedSlot"]): string {
  if (!slot?.date || !slot?.time) return "—";
  try {
    const d = new Date(slot.date);
    if (Number.isNaN(d.getTime())) return `${slot.date} · ${slot.time}`;
    return `${d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })} · ${slot.time}`;
  } catch {
    return `${slot.date} · ${slot.time}`;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BwLeadBody;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const telefon = (body.telefon ?? "").trim();

    if (!name || !email || !telefon) {
      return NextResponse.json(
        { success: false, error: "Pflichtfelder: name, email, telefon" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[leads] RESEND_API_KEY fehlt — Lead nicht per E-Mail versendet");
      return NextResponse.json(
        {
          success: false,
          error: "E-Mail-Versand nicht konfiguriert (RESEND_API_KEY)",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const situation = body.situation ?? "—";
    const bereiche = (body.bereiche ?? []).join(", ") || "—";
    const preisrange = `${body.priceMin ?? 0} – ${body.priceMax ?? 0} €`;
    const plz = body.plz ?? "—";
    const zeitraum = body.zeitraum ?? "—";
    const fotos = String(body.photoCount ?? 0);
    const kundentyp = body.kundentyp?.trim() || "nicht angegeben";

    const situationNorm = (body.situation ?? "").trim();
    const leadType: "beratung" | "system" | "ausserhalb" =
      body.leadType === "ausserhalb"
        ? "ausserhalb"
        : body.leadType === "beratung" ||
            situationNorm === "gewerbe" ||
            situationNorm === "gastro"
          ? "beratung"
          : "system";

    const beschreibung = (body.beschreibung ?? "").trim();

    const text =
      leadType === "ausserhalb"
        ? [
            `Lead-Typ: Außerhalb Radius`,
            `Name: ${name}`,
            `Telefon: ${telefon}`,
            `E-Mail: ${email || "—"}`,
            `PLZ: ${plz}`,
            beschreibung ? `Beschreibung: ${beschreibung}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : leadType === "beratung"
          ? [
              `Lead-Typ: Beratung (Gewerbe/Gastro)`,
              `Name: ${name}`,
              `Telefon: ${telefon}`,
              `E-Mail: ${email}`,
              `Situation: ${situation}`,
              `Kundentyp: ${kundentyp}`,
              `Bereiche: ${bereiche}`,
              beschreibung ? `Beschreibung: ${beschreibung}` : "",
              `Fotos: ${fotos}`,
              `PLZ: ${plz || "—"}`,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `Lead-Typ: System (Rechner)`,
              `Name: ${name}`,
              `Telefon: ${telefon}`,
              `E-Mail: ${email}`,
              `Situation: ${situation}`,
              `Kundentyp: ${kundentyp}`,
              `Bereiche: ${bereiche}`,
              `Preisrange: ${preisrange}`,
              `PLZ: ${plz}`,
              `Zeitraum: ${zeitraum}`,
              `Budget: ${budgetLine(body)}`,
              `Termin: ${slotLine(body.selectedSlot)}`,
              `Fotos: ${fotos}`,
              body.dringlichkeit ? `Dringlichkeit: ${body.dringlichkeit}` : "",
              body.umfang ? `Umfang: ${body.umfang}` : "",
            ]
              .filter(Boolean)
              .join("\n");

    const subject =
      leadType === "ausserhalb"
        ? `Außerhalb Radius: ${name} — PLZ ${plz}`
        : leadType === "beratung"
          ? `Beratungsanfrage: ${name} — ${situationNorm || kundentyp}`
          : `Neuer Lead: ${name} — ${situation}`;

    // Resend mit 5s Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let sendError: string | undefined;
    try {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Bärenwald <onboarding@resend.dev>",
        to: SITE_CONFIG.email,
        subject,
        text,
      });
      if (error) sendError = error.message;
    } finally {
      clearTimeout(timeoutId);
    }

    if (sendError) {
      console.error("[leads] Resend:", sendError);
      return NextResponse.json(
        { success: false, error: sendError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ungültige Anfrage";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
