import { NextResponse } from "next/server";
import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";

export type SavePriceBody = {
  email?: string;
  priceMin?: number;
  priceMax?: number;
  situation?: string | null;
  bereiche?: string[];
  plz?: string;
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SavePriceBody;
    const email = (body.email ?? "").trim();
    const priceMin = Number(body.priceMin ?? 0);
    const priceMax = Number(body.priceMax ?? 0);
    const situation = (body.situation ?? "—").toString();
    const bereiche = (body.bereiche ?? []).join(", ") || "—";
    const plz = (body.plz ?? "").trim() || "—";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Ungültige E-Mail-Adresse" },
        { status: 400 }
      );
    }
    if (priceMin <= 0 || priceMax <= 0) {
      return NextResponse.json(
        { success: false, error: "Ungültiger Preisrahmen" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[save-price] RESEND_API_KEY fehlt");
      return NextResponse.json(
        {
          success: false,
          error: "E-Mail-Versand nicht konfiguriert (RESEND_API_KEY)",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM ?? "Bärenwald <onboarding@resend.dev>";
    const rechnerUrl = `${SITE_CONFIG.url}/rechner`;

    const customerText = [
      "Hallo,",
      "",
      "hier ist dein Preisrahmen:",
      "",
      `${situation} — ${bereiche}`,
      `${priceMin.toLocaleString("de-DE")} – ${priceMax.toLocaleString("de-DE")} €`,
      "Richtwert für München & Umgebung",
      "",
      "Alle Angaben unverbindlich.",
      "Das verbindliche Angebot erhalten Sie nach dem Vor-Ort-Termin.",
      "",
      "Bereit für den nächsten Schritt?",
      `→ ${rechnerUrl}`,
      "",
      "Bärenwald München",
      SITE_CONFIG.phone.replace(/\s/g, " "),
      SITE_CONFIG.email,
    ].join("\n");

    const internalText = [
      "Lead-Typ: email_save (Preisrahmen per E-Mail)",
      `E-Mail: ${email}`,
      `Situation: ${situation}`,
      `Bereiche: ${bereiche}`,
      `PLZ: ${plz}`,
      `Preisrange: ${priceMin} – ${priceMax} €`,
    ].join("\n");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let sendError: string | undefined;
    try {
      const { error: err1 } = await resend.emails.send({
        from,
        to: email,
        subject: "Dein Preisrahmen von Bärenwald München",
        text: customerText,
      });
      if (err1) sendError = err1.message;
      if (!sendError) {
        const { error: err2 } = await resend.emails.send({
          from,
          to: SITE_CONFIG.email,
          subject: `Rechner: Preis gespeichert — ${email}`,
          text: internalText,
        });
        if (err2) sendError = err2.message;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (sendError) {
      console.error("[save-price] Resend:", sendError);
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
