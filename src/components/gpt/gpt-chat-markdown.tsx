import type { ReactNode } from "react";

export function formatInlineMarkdown(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${keyPrefix}-b-${i++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={`${keyPrefix}-i-${i++}`}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function isBulletLine(line: string): boolean {
  return /^([•*\-]|\d+\.)\s+/.test(line);
}

function bulletItemText(line: string): string {
  return line.replace(/^([•*\-]|\d+\.)\s+/, "");
}

export function renderChatMarkdown(content: string): ReactNode {
  const lines = content.split("\n");
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
  return nodes.length > 0 ? nodes : content;
}
