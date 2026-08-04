import type { GptLeadDraft, GptLeadField } from "@/lib/gpt-viz/lead-collect";
import { formatLeadDraftSummary, leadFieldLabel } from "@/lib/gpt-viz/lead-collect";

export function buildGptStudioLeadPrompt(
  draft: GptLeadDraft,
  nextField: GptLeadField | null
): string {
  const erfasst = formatLeadDraftSummary(draft) || "Noch nichts erfasst.";

  return `LEAD-MODUS: Du nimmst eine Projekt-Anfrage im Chat auf — kein externes Formular, keine Weiterleitung.

Bereits erfasst:
${erfasst}

${
  nextField
    ? `Als Nächstes brauchst du: **${leadFieldLabel(nextField)}**.
Bestätige kurz freundlich, was du aus der letzten Nutzer-Nachricht verstanden hast (falls sinnvoll), und stelle GENAU EINE klare Frage für dieses Feld.`
    : `Alle Pflichtangaben sind da. Fasse kurz zusammen und sage, dass du die Anfrage jetzt an Bärenwald sendest — freundlich und knapp.`
}

REGELN:
- Nur Fließtext, kein JSON, keine Formularfelder erwähnen.
- Eine Frage pro Nachricht.
- Kein „Kontaktformular auf der Website“.`;
}
