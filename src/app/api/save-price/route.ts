import { NextResponse } from "next/server";
import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import {
  buildSavePriceCustomerHtml,
  buildSavePriceInternalHtml,
  SAVE_PRICE_CUSTOMER_EMAIL_SUBJECT,
} from "@/lib/email/lead-mail-templates";
import { getPostHogClient } from "@/lib/posthog-server";

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

    const customerHtml = buildSavePriceCustomerHtml({
      situation,
      bereiche,
      plz,
      priceMin,
      priceMax,
    });

    const internalHtml = buildSavePriceInternalHtml({
      email,
      situation,
      bereiche,
      plz,
      priceMin,
      priceMax,
    });

    let sendError: string | undefined;
    const { error: err1 } = await resend.emails.send({
      from,
      to: email,
      subject: SAVE_PRICE_CUSTOMER_EMAIL_SUBJECT,
      html: customerHtml,
    });
    if (err1) sendError = err1.message;
    if (!sendError) {
      const { error: err2 } = await resend.emails.send({
        from,
        to: SITE_CONFIG.email,
        subject: `Rechner: Preis gespeichert — ${email}`,
        html: internalHtml,
      });
      if (err2) sendError = err2.message;
    }

    if (sendError) {
      console.error("[save-price] Resend:", sendError);
      return NextResponse.json(
        { success: false, error: sendError },
        { status: 500 }
      );
    }

    const posthog = getPostHogClient();
    posthog?.capture({
      distinctId: email,
      event: "server_price_email_sent",
      properties: {
        situation,
        plz,
        price_min: priceMin,
        price_max: priceMax,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ungültige Anfrage";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
