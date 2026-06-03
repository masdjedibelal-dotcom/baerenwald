import {
  sendHandwerkerLeistungZuweisungMail,
  type LeistungZuweisungMailLeistung,
} from "@/lib/partner/partner-mail";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

function formatZeitraum(start?: string | null, end?: string | null): string | undefined {
  const fmt = (v?: string | null) => {
    if (!v?.trim()) return "";
    const d = new Date(v.trim());
    if (Number.isNaN(d.getTime())) return v.trim();
    return d.toLocaleDateString("de-DE");
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || undefined;
}

function adresseZeile(kunde: {
  adresse?: string | null;
  plz?: string | null;
  ort?: string | null;
} | null): string {
  if (!kunde) return "München";
  const plzOrt = [kunde.plz?.trim(), kunde.ort?.trim()].filter(Boolean).join(" ");
  const parts = [kunde.adresse?.trim(), plzOrt].filter(Boolean);
  return parts.join(", ") || plzOrt || "München";
}

/** CRM → Partner-Mail nach Zuweisung einer oder mehrerer Leistungen. */
export async function notifyHandwerkerLeistungZuweisung(input: {
  auftragId: string;
  handwerkerId: string;
  positionId?: string;
  positionIds?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const auftragId = input.auftragId.trim();
  const handwerkerId = input.handwerkerId.trim();
  if (!auftragId || !handwerkerId) {
    return { ok: false, error: "auftragId oder handwerkerId fehlt." };
  }

  const ids = [
    ...(input.positionId?.trim() ? [input.positionId.trim()] : []),
    ...(input.positionIds ?? []).map((id) => id.trim()).filter(Boolean),
  ];
  const uniquePosIds = Array.from(new Set(ids));

  const { data: hw, error: hwErr } = await supabaseAdmin
    .from("handwerker")
    .select("id, name, email, firma, aktiv")
    .eq("id", handwerkerId)
    .maybeSingle();

  if (hwErr || !hw) {
    return { ok: false, error: hwErr?.message ?? "Handwerker nicht gefunden." };
  }
  if (hw.aktiv === false) {
    return { ok: false, error: "Handwerker ist nicht aktiv." };
  }

  const to = (hw.email as string | null)?.trim();
  if (!to) {
    return { ok: false, error: "Handwerker hat keine E-Mail." };
  }

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, start_datum, end_datum, kunden(name, adresse, plz, ort)")
    .eq("id", auftragId)
    .maybeSingle();

  if (aErr || !auftrag) {
    return { ok: false, error: aErr?.message ?? "Auftrag nicht gefunden." };
  }

  let posQuery = supabaseAdmin
    .from("auftrag_positionen")
    .select("id, gewerk_name, leistung_name, beschreibung, menge, einheit")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId);

  if (uniquePosIds.length) {
    posQuery = posQuery.in("id", uniquePosIds);
  }

  const { data: posRows, error: pErr } = await posQuery.order("sort_order", {
    ascending: true,
  });

  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  const leistungen: LeistungZuweisungMailLeistung[] = (posRows ?? []).map((p) => ({
    leistung_name: String(p.leistung_name ?? "Leistung"),
    gewerk_name: String(p.gewerk_name ?? "Gewerk"),
    beschreibung: p.beschreibung as string | null,
    menge: p.menge as number | null,
    einheit: p.einheit as string | null,
  }));

  if (!leistungen.length) {
    return { ok: false, error: "Keine zugewiesenen Leistungen für die Mail gefunden." };
  }

  const kunde = one(
    (auftrag as { kunden?: unknown }).kunden
  ) as {
    name?: string | null;
    adresse?: string | null;
    plz?: string | null;
    ort?: string | null;
  } | null;

  const auftragTitel =
    (auftrag.titel as string | null)?.trim() ||
    (kunde?.name ? `Auftrag — ${kunde.name}` : "Baustelle");

  return sendHandwerkerLeistungZuweisungMail({
    to,
    handwerkerName: (hw.name as string)?.trim() || "Partner",
    auftragId,
    auftragTitel,
    kundeName: kunde?.name?.trim() || "Kunde",
    adresseZeile: adresseZeile(kunde),
    zeitraum: formatZeitraum(
      auftrag.start_datum as string | null,
      auftrag.end_datum as string | null
    ),
    leistungen,
  });
}
