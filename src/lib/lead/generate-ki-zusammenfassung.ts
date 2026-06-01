import {
  createAnthropicClient,
  getClaudeApiKey,
} from "@/lib/ki-rechner/claude-config";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const KI_ZUSAMMENFASSUNG_MODEL = "claude-sonnet-4-20250514";

const KI_ZUSAMMENFASSUNG_SYSTEM = `
Du bist ein erfahrener Vertriebs-Analyst für Bärenwald München —
ein digitaler Generalunternehmer für Handwerk in München.

Analysiere den Chat-Verlauf zwischen Assistent und Kunde.
Erstelle eine präzise Einschätzung für den Sachbearbeiter der den Kunden gleich anruft.

Analysiere diese 6 Bereiche:

1. LEAD-QUALITÄT:
   Heiß / Warm / Kalt
   Ein Satz Begründung

2. BEDARF & PLANUNG:
   Was genau will er
   Wie weit ist die Planung
   (nur Idee / konkret geplant / bereits entschieden)
   Hat er schon Details genannt
   (Fliesen ausgesucht, Handwerker gesucht, etc.)

3. PERSONA & KENNTNISSTAND:
   Kennt er sich aus mit Handwerk
   oder kompletter Laie?
   Schreibt er kurz/lang, formal/locker, sicher/unsicher?
   Was sagt das über ihn?
   Wie soll man mit ihm reden?

4. PSYCHOLOGIE & MOTIVATION:
   Was treibt ihn an?
   (Stress, Zeitdruck, Qualität, Preis, Kontrolle verlieren?)
   Welche Worte/Formulierungen hat er benutzt die das zeigen?
   Ist er eher emotional oder rational?

5. KAUFSIGNALE & RISIKEN:
   Positive Signale für Abschluss
   Einwände oder Bedenken
   Warnsignale (vergleicht Preise, unentschlossen, etc.)

6. EMPFEHLUNG FÜR DEN ANRUF:
   Was ist der beste erste Satz beim Anruf?
   Worauf eingehen?
   Was vermeiden?
   Welches Argument überzeugt diesen Kunden?

Format:
  Emoji je Bereich
  Kurze prägnante Stichpunkte
  Kein langer Fließtext
  Direkt und ehrlich
  Max 15 Zeilen gesamt
`.trim();

export type KiChatVerlaufEntry = {
  role: string;
  content: string;
};

/** Async-Vertriebs-Analyse nach Lead-Speicherung (KI-Rechner). */
export async function generateKiZusammenfassung(
  leadId: string,
  chatVerlauf: KiChatVerlaufEntry[],
  sessionId: string
): Promise<void> {
  const apiKey = getClaudeApiKey();
  if (!apiKey || !isSupabaseConfigured()) return;

  const client = createAnthropicClient(apiKey);

  const chatText = chatVerlauf
    .map(
      (m) =>
        `${m.role === "user" ? "Kunde" : "Assistent"}: ${m.content}`
    )
    .join("\n");

  const response = await client.messages.create({
    model: KI_ZUSAMMENFASSUNG_MODEL,
    max_tokens: 500,
    system: KI_ZUSAMMENFASSUNG_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Chat-Verlauf:\n\n${chatText}`,
      },
    ],
  });

  const zusammenfassung =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  if (!zusammenfassung.trim()) return;

  const { error: leadErr } = await supabaseAdmin
    .from("leads")
    .update({
      ki_zusammenfassung: zusammenfassung,
      ki_session_id: sessionId,
    })
    .eq("id", leadId);

  if (leadErr) {
    console.error("[generateKiZusammenfassung] leads update:", leadErr);
    return;
  }

  const { error: logErr } = await supabaseAdmin
    .from("ki_anfragen_log")
    .update({
      lead_id: leadId,
      lead_erstellt: true,
    })
    .eq("session_id", sessionId);

  if (logErr) {
    console.error("[generateKiZusammenfassung] ki_anfragen_log:", logErr);
  }
}
