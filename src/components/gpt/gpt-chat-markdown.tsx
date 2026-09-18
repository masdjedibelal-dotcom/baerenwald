import type { ReactNode } from "react";

/**
 * GPT-Antworten: Markdown/leichte HTML-Struktur → React
 * (**fett**, *kursiv*, Listen, Überschriften; einfache HTML-Tags).
 */

/** Häufige Modell-HTML → Markdown, Rest-Tags entfernen. */
export function normalizeGptMarkup(raw: string): string {
  let s = String(raw ?? "");
  if (!s) return "";

  s = s
    .replace(/\r\n/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/?(strong|b)\s*>/gi, "**")
    .replace(/<\/?(em|i)\s*>/gi, "*")
    .replace(/<h([1-3])[^>]*>/gi, "\n**")
    .replace(/<\/h[1-3]>/gi, "**\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/?div[^>]*>/gi, "\n")
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "");

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

export function formatInlineMarkdown(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  // **bold** | __bold__ | *italic* | _italic_ (kein greedy über Zeilen)
  const re =
    /(\*\*((?:[^*]|\*(?!\*))+?)\*\*|__((?:[^_]|_(?!_))+?)__|\*((?:[^*])+?)\*|_((?:[^_])+?)_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] != null) {
      parts.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{match[2]}</strong>
      );
    } else if (match[3] != null) {
      parts.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{match[3]}</strong>
      );
    } else if (match[4] != null) {
      parts.push(<em key={`${keyPrefix}-i-${i++}`}>{match[4]}</em>);
    } else if (match[5] != null) {
      parts.push(<em key={`${keyPrefix}-i-${i++}`}>{match[5]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function isBulletLine(line: string): boolean {
  return /^([•*\-]|\d+[.)])\s+/.test(line);
}

function bulletItemText(line: string): string {
  return line.replace(/^([•*\-]|\d+[.)])\s+/, "");
}

function isHeadingLine(line: string): RegExpMatchArray | null {
  return line.match(/^(#{1,3})\s+(.+)$/);
}

export function renderChatMarkdown(content: string): ReactNode {
  const normalized = normalizeGptMarkup(content);
  const lines = normalized.split("\n");
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="ki-rechner-chat-list">
        {bullets.map((item) => (
          <li key={`li-${key++}`}>{formatInlineMarkdown(item, `li-${key}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      continue;
    }

    const heading = isHeadingLine(trimmed);
    if (heading) {
      flushBullets();
      const level = heading[1].length;
      const title = heading[2];
      const cls =
        level === 1
          ? "ki-rechner-chat-h ki-rechner-chat-h1"
          : level === 2
            ? "ki-rechner-chat-h ki-rechner-chat-h2"
            : "ki-rechner-chat-h ki-rechner-chat-h3";
      nodes.push(
        <p key={`h-${key++}`} className={cls}>
          {formatInlineMarkdown(title, `h-${key}`)}
        </p>
      );
      continue;
    }

    if (isBulletLine(trimmed)) {
      bullets.push(bulletItemText(trimmed));
      continue;
    }

    flushBullets();
    nodes.push(
      <p key={`p-${key++}`} className="ki-rechner-chat-para">
        {formatInlineMarkdown(trimmed, `p-${key}`)}
      </p>
    );
  }
  flushBullets();
  return nodes.length > 0 ? nodes : normalized;
}
