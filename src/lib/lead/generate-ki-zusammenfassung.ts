import {
  createAnthropicClient,
  getClaudeApiKey,
} from "@/lib/ki-rechner/claude-config";
import {
  buildVertriebsAnalyseUserPrompt,
  hasVertriebsAnalyseGrundlage,
  type KiChatVerlaufEntry,
  type VertriebsAnalyseInput,
} from "@/lib/lead/vertriebs-analyse-context";
import type { KundenVertriebsKontext } from "@/lib/lead/kunden-vertrieb-status";
import type { MarketingJourney } from "@/lib/marketing/journey-types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const KI_ZUSAMMENFASSUNG_MODEL = "claude-sonnet-4-20250514";

const KI_ZUSAMMENFASSUNG_SYSTEM = `
Du bist ein erfahrener Vertriebs-Analyst für Bärenwald München —
ein digitaler Generalunternehmer für Handwerk in München.

Du erhältst KUNDENSTATUS, HERKUNFT/AKTIVITÄT auf der Website, Funnel-Daten und optional einen KI-Chat.
Erstelle eine präzise Einschätzung für den Sachbearbeiter, der den Kunden gleich anruft.

Analysiere diese Bereiche:

1. LEAD-QUALITÄT:
   Heiß / Warm / Kalt — ein Satz Begründung

2. KUNDENSTATUS:
   Neukunde oder Bestandskunde — was bedeutet das für den Anruf?
   Wiederholte Anfrage? Portal-Nutzer? Vertrauen schon da oder erst aufbauen?

3. HERKUNFT & INTERESSE:
   Woher kam er (Referrer, UTM, Landing)?
   Welche Seiten/Klicks zeigen echtes Interesse (Leistung, Rechner, Ratgeber)?
   Passt das zur aktuellen Anfrage?

4. BEDARF & PLANUNG:
   Was will er, wie weit ist die Planung, konkrete Details?

5. PERSONA & ANSPRACHE:
   Laie vs. Kenner, Tonfall, wie ansprechen?

6. PSYCHOLOGIE & KAUFSIGNALE:
   Motivation, positive Signale, Risiken/Einwände

7. EMPFEHLUNG FÜR DEN ANRUF:
   Bester erster Satz, worauf eingehen, was vermeiden

Format:
  Emoji je Bereich
  Kurze Stichpunkte
  Kein langer Fließtext
  Direkt und ehrlich
  Max 22 Zeilen gesamt
`.trim();

export type { KiChatVerlaufEntry } from "@/lib/lead/vertriebs-analyse-context";

export type GenerateLeadVertriebsAnalyseOpts = {
  leadId: string;
  sessionId?: string;
  chatVerlauf?: KiChatVerlaufEntry[];
  funnelDaten?: Record<string, unknown>;
  marketingJourney?: MarketingJourney | null;
  kundenKontext?: KundenVertriebsKontext | null;
  leadMeta?: VertriebsAnalyseInput["leadMeta"];
};

/** Async-Vertriebs-Analyse nach Lead-Speicherung (Chat + Funnel + Session + Kundenstatus). */
export async function generateLeadVertriebsAnalyse(
  opts: GenerateLeadVertriebsAnalyseOpts
): Promise<void> {
  const apiKey = getClaudeApiKey();
  if (!apiKey || !isSupabaseConfigured()) return;

  const input: VertriebsAnalyseInput = {
    chatVerlauf: opts.chatVerlauf,
    funnelDaten: opts.funnelDaten,
    marketingJourney: opts.marketingJourney,
    kundenKontext: opts.kundenKontext,
    leadMeta: opts.leadMeta,
  };

  if (!hasVertriebsAnalyseGrundlage(input)) return;

  const client = createAnthropicClient(apiKey);
  const userContent = buildVertriebsAnalyseUserPrompt(input);

  const response = await client.messages.create({
    model: KI_ZUSAMMENFASSUNG_MODEL,
    max_tokens: 650,
    system: KI_ZUSAMMENFASSUNG_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  const zusammenfassung =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  if (!zusammenfassung.trim()) return;

  const patch: Record<string, unknown> = {
    ki_zusammenfassung: zusammenfassung,
  };
  if (opts.sessionId) patch.ki_session_id = opts.sessionId;

  const { error: leadErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", opts.leadId);

  if (leadErr) {
    console.error("[generateLeadVertriebsAnalyse] leads update:", leadErr);
    return;
  }

  if (opts.sessionId) {
    const { error: logErr } = await supabaseAdmin
      .from("ki_anfragen_log")
      .update({
        lead_id: opts.leadId,
        lead_erstellt: true,
      })
      .eq("session_id", opts.sessionId);

    if (logErr) {
      console.error("[generateLeadVertriebsAnalyse] ki_anfragen_log:", logErr);
    }
  }
}

/** @deprecated Alias — bitte {@link generateLeadVertriebsAnalyse} nutzen. */
export async function generateKiZusammenfassung(
  leadId: string,
  chatVerlauf: KiChatVerlaufEntry[],
  sessionId: string
): Promise<void> {
  return generateLeadVertriebsAnalyse({
    leadId,
    sessionId,
    chatVerlauf,
  });
}
