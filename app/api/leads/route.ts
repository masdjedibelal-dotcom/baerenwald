import { NextResponse } from "next/server";

import type { PersistLeadInput } from "@/lib/lead/persist-lead";
import { persistLead } from "@/lib/lead/persist-lead";
import type { PriceLineItem } from "@/lib/funnel/types";

/** Legacy Payload vom Funnel (`BwLeadBody`) — wird auf {@link PersistLeadInput} gemappt. */
export type BwLeadBody = {
  name?: string;
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
  situation?: string | null;
  bereiche?: string[];
  priceMin?: number;
  priceMax?: number;
  breakdown?: PriceLineItem[];
  plz?: string;
  zeitraum?: string | null;
  budgetCheck?: string | null;
  budgetGespraech?: boolean;
  selectedSlot?: { date: string; time: string } | null;
  photoCount?: number;
  dringlichkeit?: string | null;
  umfang?: string | null;
  kundentyp?: string | null;
  leadType?: "beratung" | "system" | "ausserhalb" | "komplex_rueckruf";
  beschreibung?: string;
  freitext?: string;
};

function mapBwLeadToPersist(body: BwLeadBody): PersistLeadInput {
  const beschreibung = (body.beschreibung ?? "").trim();
  const freitext = (body.freitext ?? "").trim();
  const notizen = [beschreibung, freitext].filter(Boolean).join("\n\n");

  let funnel_quelle: NonNullable<PersistLeadInput["funnel_quelle"]> =
    "rechner_haupt";
  if (body.leadType === "komplex_rueckruf") funnel_quelle = "komplex_rueckruf";
  else if (body.leadType === "ausserhalb") funnel_quelle = "ausserhalb";
  else if (
    body.leadType === "beratung" ||
    (body.situation ?? "").trim() === "gewerbe"
  ) {
    funnel_quelle = "beratung";
  }

  const funnel_daten = {
    leadType: body.leadType,
    vorname: body.vorname,
    nachname: body.nachname,
    photoCount: body.photoCount,
    breakdown: body.breakdown,
    budgetCheck: body.budgetCheck,
    budgetGespraech: body.budgetGespraech,
    selectedSlot: body.selectedSlot,
    dringlichkeit: body.dringlichkeit,
    umfang: body.umfang,
  };

  let name = (body.name ?? "").trim();
  if (!name && body.leadType === "komplex_rueckruf") {
    name = "Ohne Namenangabe";
  }

  return {
    name,
    email: (body.email ?? "").trim() || undefined,
    telefon: (body.telefon ?? "").trim() || undefined,
    notizen: notizen || undefined,
    plz: body.plz ?? "",
    situation: body.situation ?? null,
    bereiche: body.bereiche ?? [],
    preis_min: body.priceMin,
    preis_max: body.priceMax,
    zeitraum: body.zeitraum ?? null,
    kundentyp: body.kundentyp ?? null,
    kanal: "website",
    funnel_quelle,
    funnel_daten,
  };
}

/**
 * Legacy-Endpunkt — gleiche Persistenz wie `/api/lead`.
 * Antwort kompatibel: `{ success: true }` bei Erfolg (optional `id` ergänzt).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BwLeadBody;
    const isKomplexRueckruf = body.leadType === "komplex_rueckruf";

    if (isKomplexRueckruf) {
      const tel = (body.telefon ?? "").trim();
      if (!tel) {
        return NextResponse.json(
          { success: false, ok: false, error: "Pflichtfeld: telefon" },
          { status: 400 }
        );
      }
    }

    const input = mapBwLeadToPersist(body);
    const result = await persistLead(input);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, ok: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      ok: true,
      id: result.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ungültige Anfrage";
    return NextResponse.json(
      { success: false, ok: false, error: msg },
      { status: 400 }
    );
  }
}
