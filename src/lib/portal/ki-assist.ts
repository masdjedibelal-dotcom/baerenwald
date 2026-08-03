/** Portal-KI-Assist: Scopes + bw-apply Parsing (CRM-kompatibel). */

export type PortalKiAssistScope =
  | "funnel_beschreibung"
  | "bautagebuch"
  | "abnahmeprotokoll";

export type PortalKiAssistMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PortalKiAssistDraft = {
  type: "text";
  titel?: string;
  text: string;
};

const BW_APPLY_HINT = `
Wenn der Nutzer Inhalt für das Formular will, antworte kurz menschlich UND am Ende genau einen Block:

\`\`\`bw-apply
{"type":"text","text":"…"}
\`\`\`

"text" enthält NUR den fertigen Feldwert — keine Anführungszeichen um den gesamten Text, keine Meta-Sätze.
Nur ein bw-apply-Block. Ton: Bärenwald Handwerk, klar, freundlich, ohne Marketing-Floskeln.
`.trim();

export type PortalKiAssistScopeConfig = {
  id: PortalKiAssistScope;
  label: string;
  intro: string;
  placeholder: string;
  systemHint: string;
  quickPrompts: { label: string; prompt: string }[];
  /** Partner-Auth nötig */
  requiresPartnerAuth: boolean;
};

export const PORTAL_KI_ASSIST_SCOPES: Record<
  PortalKiAssistScope,
  PortalKiAssistScopeConfig
> = {
  funnel_beschreibung: {
    id: "funnel_beschreibung",
    label: "Beschreibung",
    intro:
      "Ich helfe dir, dein Anliegen klar zu beschreiben — sag mir, was passiert ist oder was du ändern willst.",
    placeholder: "z. B. „Kürzer und klarer“ oder „Wasser tropft unter der Spüle“…",
    systemHint: `Modus: Schaden-/Anliegen-Beschreibung im Melde-Funnel (Mieter oder Kunde).
Schreib einen verständlichen, sachlichen Freitext für die Hausverwaltung / Bärenwald.
Keine erfundenen Fakten. Du/Sie: du, wenn der Nutzer duzt, sonst klar und höflich.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: "Ausformulieren",
        prompt:
          "Formuliere meinen Entwurf klar und vollständig als fertige Beschreibung zum Übernehmen.",
      },
      {
        label: "Kürzer",
        prompt: "Formuliere die aktuelle Beschreibung kürzer und klarer.",
      },
      {
        label: "Sachlicher",
        prompt: "Formuliere die Beschreibung sachlicher und für die Hausverwaltung geeignet.",
      },
    ],
    requiresPartnerAuth: false,
  },
  bautagebuch: {
    id: "bautagebuch",
    label: "Bautagebuch",
    intro:
      "Ich formuliere den **Tagebuch-Eintrag**. Beschreib kurz, was gemacht wurde — danach kannst du den Text übernehmen.",
    placeholder: "z. B. „Sauberer, kundensichtbar“ oder Stichworte zum Tag…",
    systemHint: `Modus: Bautagebuch-Eintrag (Handwerker-Dokumentation, kundensichtbar möglich).
Klar, sachlich, deutsch, kurz. Keine erfundenen Fakten oder Mengen.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: "Korrigieren",
        prompt: "Korrigiere Rechtschreibung und Formuliere den Eintrag klar und professionell.",
      },
      {
        label: "Kürzer",
        prompt: "Kürze den Eintrag, behalte die Kernaussage.",
      },
      {
        label: "Kundensichtbar",
        prompt: "Formuliere kundentauglich und verständlich, ohne Internes.",
      },
    ],
    requiresPartnerAuth: true,
  },
  abnahmeprotokoll: {
    id: "abnahmeprotokoll",
    label: "Abnahme",
    intro:
      "Ich helfe bei **Protokoll- oder Mängeltext**. Sag, was rein soll — danach Übernehmen.",
    placeholder: "z. B. „Arbeiten zusammenfassen“ oder „Mängel klarer“…",
    systemHint: `Modus: Abnahmeprotokoll / Vorbehalte / Mängelbeschreibung (Handwerker).
Sachlich, konkret, deutsch. Keine erfundenen Mängel.
${BW_APPLY_HINT}`,
    quickPrompts: [
      {
        label: "Protokoll",
        prompt: "Formuliere einen klaren Protokolltext zu den durchgeführten Arbeiten.",
      },
      {
        label: "Mängel klar",
        prompt: "Formuliere die Mängel-/Vorbehalte-Beschreibung klar und prüfbar.",
      },
      {
        label: "Kürzer",
        prompt: "Kürze den Text, behalte die Kernpunkte.",
      },
    ],
    requiresPartnerAuth: true,
  },
};

const BW_APPLY_RE =
  /```bw-apply\s*([\s\S]*?)```/i;

export function parsePortalKiAssistDraft(
  content: string
): PortalKiAssistDraft | null {
  const m = content.match(BW_APPLY_RE);
  if (!m?.[1]) return null;
  try {
    const raw = JSON.parse(m[1].trim()) as Record<string, unknown>;
    if (raw.type !== "text") return null;
    const text = String(raw.text ?? "").trim();
    if (!text) return null;
    const titel =
      typeof raw.titel === "string" && raw.titel.trim()
        ? raw.titel.trim()
        : undefined;
    return { type: "text", text, titel };
  } catch {
    return null;
  }
}

export function stripPortalKiAssistApplyBlock(content: string): string {
  return content.replace(BW_APPLY_RE, "").trim();
}

export function isPortalKiAssistScope(
  v: string
): v is PortalKiAssistScope {
  return v in PORTAL_KI_ASSIST_SCOPES;
}

export function buildPortalKiAssistSystemPrompt(opts: {
  scope: PortalKiAssistScope;
  fieldLabel: string;
  currentText: string;
  contextHint?: string | null;
}): string {
  const cfg = PORTAL_KI_ASSIST_SCOPES[opts.scope];
  const current = opts.currentText.trim();
  return [
    cfg.systemHint,
    `Feldname: ${opts.fieldLabel}`,
    opts.contextHint?.trim()
      ? `Zusatzkontext:\n${opts.contextHint.trim()}`
      : null,
    "Aktueller Feldtext:",
    current
      ? `"""\n${current}\n"""`
      : "(leer — formuliere einen passenden neuen Text)",
  ]
    .filter(Boolean)
    .join("\n\n");
}
