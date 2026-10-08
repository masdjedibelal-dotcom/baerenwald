import { cn } from "@/lib/utils";

/** Erlaubte Formatierung aus dem CRM-Editor (fett, kursiv, Listen, Absätze). */
const ERLAUBT = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "div", "span"]);

/**
 * Formatierten Text aus dem CRM sicher als HTML: nur erlaubte Tags, ohne Attribute
 * (keine Links, Bilder, Skripte, Styles). Alles andere wird entfernt.
 */
export function formatTextHtml(raw: string): string {
  return raw
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(\/?)\s*([a-z0-9]+)[^>]*>/gi, (_m, zu: string, tag: string) => {
      const t = tag.toLowerCase();
      return ERLAUBT.has(t) ? `<${zu}${t}>` : "";
    });
}

/** Text aus dem CRM anzeigen — reiner Text wie bisher, formatierter Text mit fett/Listen. */
export function FormatText({ text, className }: { text: string; className?: string }) {
  const raw = text.trim();
  if (!raw) return null;
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return <p className={cn("whitespace-pre-wrap", className)}>{raw}</p>;
  }
  return (
    <div
      className={cn("format-text", className)}
      dangerouslySetInnerHTML={{ __html: formatTextHtml(raw) }}
    />
  );
}
