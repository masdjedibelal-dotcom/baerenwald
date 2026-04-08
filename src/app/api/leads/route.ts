import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/*
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  situation text,
  mode text,
  gewerke text[],
  flaeche integer,
  zustand text,
  price_min integer,
  price_max integer,
  name text NOT NULL,
  email text NOT NULL,
  telefon text NOT NULL,
  plz text,
  zeitraum text,
  dringlichkeit text,
  selected_slot text,
  anmerkungen text,
  photo_count integer DEFAULT 0
);
*/

type LeadBody = {
  situation?: string | null;
  mode?: string | null;
  gewerke?: string[];
  flaeche?: number;
  zustand?: string;
  priceMin?: number;
  priceMax?: number;
  name?: string;
  email?: string;
  telefon?: string;
  plz?: string;
  zeitraum?: string;
  dringlichkeit?: string | null;
  selectedSlot?: string | null;
  anmerkungen?: string;
  photos?: { name?: string }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadBody;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const telefon = (body.telefon ?? "").trim();

    if (!name || !email || !telefon) {
      return NextResponse.json(
        { success: false, error: "Pflichtfelder: name, email, telefon" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const photoCount = Array.isArray(body.photos) ? body.photos.length : 0;

    const row = {
      situation: body.situation ?? null,
      mode: body.mode ?? null,
      gewerke: body.gewerke ?? [],
      flaeche: typeof body.flaeche === "number" ? Math.round(body.flaeche) : null,
      zustand: body.zustand ?? "",
      price_min: typeof body.priceMin === "number" ? Math.round(body.priceMin) : null,
      price_max: typeof body.priceMax === "number" ? Math.round(body.priceMax) : null,
      name,
      email,
      telefon,
      plz: body.plz ?? "",
      zeitraum: body.zeitraum ?? "",
      dringlichkeit: body.dringlichkeit ?? null,
      selected_slot: body.selectedSlot ?? null,
      anmerkungen: body.anmerkungen ?? "",
      photo_count: photoCount,
    };

    if (!url || !key) {
      console.info("[leads] Kein Supabase env — Lead nur geloggt:", row);
      return NextResponse.json({
        success: true,
        leadId: `local-${Date.now()}`,
      });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("leads")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("[leads] Supabase:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leadId: data?.id ?? "unknown",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ungültige Anfrage";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
