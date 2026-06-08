export type GptChatAction = {
  id: string;
  label: string;
};

export type GptChatImageRef = {
  url: string;
  label: string;
  downloadName: string;
};

/** Eine Chat-Zeile — Assistant-Bubbles können Text + optionale Anhänge kombinieren. */
export type GptChatMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  userImage?: GptChatImageRef;
  compare?: { before: GptChatImageRef; after: GptChatImageRef; beschreibung?: string };
  actions?: GptChatAction[];
  showLeadForm?: boolean;
};

export type GptVizPhase =
  | "idle"
  | "raum_upload"
  | "wunsch_quelle"
  | "inspiration_upload"
  | "wunsch_confirm"
  | "rendering"
  | "result"
  | "lead"
  | "done";

export type PendingUpload = "raum" | "inspiration" | null;

/** Vollständiger Verlauf für Claude (inkl. Bild-/Render-Kontext als Text). */
export function messagesForClaude(
  messages: GptChatMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const m of messages) {
    if (m.role === "user") {
      if (m.text?.trim()) out.push({ role: "user", content: m.text.trim() });
      else if (m.userImage) {
        out.push({ role: "user", content: `[Ich habe ein Foto hochgeladen: ${m.userImage.label}]` });
      }
    } else {
      const parts: string[] = [];
      if (m.text?.trim()) parts.push(m.text.trim());
      if (m.compare) {
        parts.push(
          `[Visualisierung erstellt — Vorher/Nachher. Wunsch: ${m.compare.beschreibung ?? ""}]`
        );
      }
      if (m.showLeadForm) parts.push("[Formular: Projekt an Bärenwald senden]");
      if (parts.length) out.push({ role: "assistant", content: parts.join("\n\n") });
    }
  }
  return out;
}

export function textMessagesForSync(
  messages: GptChatMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messagesForClaude(messages);
}

export function newChatId(): string {
  return crypto.randomUUID();
}
