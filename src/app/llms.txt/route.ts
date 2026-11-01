import { istTeo, MARKE, MARKE_WEBSITE_URL } from "@/lib/marke";
import { ratgeberPfad, TEO_RATGEBER } from "@/teo/ratgeber/artikel";

export const dynamic = "force-static";

/** llms.txt (https://llmstxt.org): kurze Beschreibung für KI-Assistenten — nur Servus TEO. */
export function GET() {
  if (!istTeo) return new Response("Not found", { status: 404 });
  const zeilen = [
    `# ${MARKE.nameLang}`,
    "",
    "> teo ist ein Handwerksbetrieb und Generalunternehmer für alles Technische an Wohnhäusern in München. Hausverwaltungen, Eigentümergemeinschaften und Bestandshalter beauftragen teo mit Reparaturen, Schäden, Wartungen und Prüffristen, Hausmeisterdienst, Reinigung, Winterdienst und Sanierungen. teo führt selbst aus und mit geprüften Meisterbetrieben, ist Vertragspartner, haftet für die Ausführung und stellt eine Rechnung. Ein Portal zeigt Verwaltung, Eigentümern und Handwerkern denselben Stand.",
    "",
    "## Website",
    "",
    `- [Startseite](${MARKE_WEBSITE_URL}/): Leistungen, Ablauf von der Meldung bis zur Rechnung, häufige Fragen`,
    `- [Anfrage stellen](${MARKE_WEBSITE_URL}/rechner): Schaden melden, Angebot für eine Maßnahme, laufender Betrieb`,
    `- [Ratgeber](${MARKE_WEBSITE_URL}/ratgeber): Wissen für Verwaltungen und Eigentümer`,
    "",
    "## Ratgeber",
    "",
    ...TEO_RATGEBER.map((a) => `- [${a.titel}](${MARKE_WEBSITE_URL}${ratgeberPfad(a.slug)}): ${a.beschreibung}`),
    "",
    "## Kontakt",
    "",
    `- E-Mail: ${MARKE.firma.email}`,
    "- Einsatzgebiet: München und Umgebung",
    "",
  ];
  return new Response(zeilen.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
