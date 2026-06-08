export type GptChatAction = {
  id: string;
  label: string;
  variant?: "primary" | "outline";
};

export type GptChatImageRef = {
  url: string;
  label: string;
  downloadName: string;
};

export type GptChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "image" | "compare" | "actions" | "lead_form" | "upload";
  text?: string;
  image?: GptChatImageRef;
  compare?: { before: GptChatImageRef; after: GptChatImageRef };
  actions?: GptChatAction[];
  uploadKind?: "raum" | "inspiration";
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

export function textMessagesForSync(messages: GptChatMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.kind === "text" && m.text?.trim())
    .map((m) => ({
      role: m.role,
      content: m.text!.trim(),
    }));
}

export function newChatId(): string {
  return crypto.randomUUID();
}
