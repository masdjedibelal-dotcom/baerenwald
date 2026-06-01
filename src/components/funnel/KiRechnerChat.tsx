"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useMobileComposerInset } from "@/hooks/use-mobile-composer-inset";
import {
  countUserMessages,
  isObviousOffTopic,
  KI_MAX_USER_MESSAGES,
  KI_OFF_TOPIC_REPLY,
  KI_TEXTAREA_MAX_LINES,
} from "@/lib/ki-rechner/guards";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import { cn } from "@/lib/utils";

const TEXTAREA_MIN_HEIGHT_PX = 40;

export type KiRechnerChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type KiRechnerChatVerlaufEntry = {
  role: string;
  content: string;
};

export type KiRechnerFunnelData = {
  situation: string;
  bereiche: string[];
  groesse?: number;
  plz?: string;
  zeitraum?: string;
  kundentyp?: string;
  fachdetails?: Record<string, string>;
  ki_session_id?: string;
  ki_chat_verlauf?: KiRechnerChatVerlaufEntry[];
};

export interface KiRechnerChatProps {
  onPreisBereit: (data: KiRechnerFunnelData) => void;
  /** Beratungs-Flow vorbereiten — Navigation nur per Footer-Button. */
  onBeratungBereit: () => void;
  /** Eingabe sperren, sobald ein Preisrahmen berechnet werden kann. */
  locked?: boolean;
}

const INITIAL_MESSAGE = `Hi! Ich bin dein Handwerks-Assistent von Bärenwald — für Renovierung, Reparatur und Umbau in München.

Ob erste Idee oder konkretes Projekt: Hier klärst du alles Handwerkliche. Ich helfe dir z. B.:
• zu verstehen, **was du wirklich brauchst** (Gewerke, Ablauf, Stolpersteine)
• bei **Fragen zu deinem Vorhaben** — auch wenn noch vieles offen ist
• zu sehen, **was als Nächstes Sinn macht**

Sind die wichtigsten Punkte da, tippst du unten auf **Zum Preis** für einen unverbindlichen Rahmen. Nicht alles musst du sofort wissen.

Womit sollen wir starten?`;

function SendMessageIcon() {
  return (
    <svg
      className="ki-rechner-chat-send-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="m22 2-7 20-4-9-9-4 20-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2 11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Einfaches Inline-Markdown (**fett**, *kursiv*) — kein vollständiger Rich-Text-Editor. */
function formatInlineMarkdown(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{token.slice(2, -2)}</strong>
      );
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

function renderChatContent(content: string): ReactNode {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="ki-rechner-chat-list">
        {bullets.map((item) => (
          <li key={`li-${key++}`}>
            {formatInlineMarkdown(item, `li-${key}`)}
          </li>
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

export function KiRechnerChat({
  onPreisBereit,
  onBeratungBereit,
  locked = false,
}: KiRechnerChatProps) {
  const [messages, setMessages] = useState<KiRechnerChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const chatRootRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userMessageCount = countUserMessages(messages);
  const limitReached = userMessageCount >= KI_MAX_USER_MESSAGES;

  useMobileComposerInset(chatRootRef);

  const syncTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const styles = getComputedStyle(ta);
    const lineHeight = parseFloat(styles.lineHeight) || 22;
    const padY =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * KI_TEXTAREA_MAX_LINES + padY;
    const next = Math.max(TEXTAREA_MIN_HEIGHT_PX, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  const scrollChatToEnd = useCallback((smooth = true) => {
    const run = () => {
      const scroller = messagesScrollRef.current;
      if (scroller) {
        scroller.scrollTo({
          top: scroller.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
        return;
      }
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    };
    requestAnimationFrame(run);
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  useEffect(() => {
    scrollChatToEnd(false);
  }, [messages, loading, error, scrollChatToEnd]);

  useEffect(() => {
    syncTextareaHeight();
  }, [input, syncTextareaHeight]);

  const handleInputFocus = useCallback(() => {
    chatRootRef.current
      ?.closest(".ki-rechner-chat-active")
      ?.classList.add("ki-input-focused");

    scrollChatToEnd(false);
    window.setTimeout(() => scrollChatToEnd(false), 120);
    window.setTimeout(() => scrollChatToEnd(false), 320);
  }, [scrollChatToEnd]);

  const handleInputBlur = useCallback(() => {
    window.setTimeout(() => {
      const vv = window.visualViewport;
      const vvOffset = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      if (vvOffset < 48) {
        chatRootRef.current
          ?.closest(".ki-rechner-chat-active")
          ?.classList.remove("ki-input-focused");
      }
    }, 80);
  }, []);

  const appendAssistant = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || locked || limitReached) return;

    const userMsg: KiRechnerChatMessage = {
      role: "user",
      content: text,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    requestAnimationFrame(syncTextareaHeight);

    if (isObviousOffTopic(text)) {
      appendAssistant(KI_OFF_TOPIC_REPLY);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ki-rechner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          session_id: sessionId,
        }),
      });

      const data = (await res.json()) as {
        parsed?: {
          typ?: string;
          antwort?: string;
          situation?: string;
          bereiche?: string[];
          groesse?: number;
          plz?: string;
          zeitraum?: string;
          kundentyp?: string;
          fachdetails?: Record<string, string>;
        };
        typ?: string;
        error?: string;
        displayText?: string;
      };

      if (!res.ok) {
        if (res.status === 429) {
          if (data.typ === "limit_reached") {
            appendAssistant(
              `Du hast die maximale Anzahl von **${KI_MAX_USER_MESSAGES} Nachrichten** erreicht. Bitte nutze **Zum Preis** oder **Zur Beratung** unten.`
            );
          } else {
            appendAssistant(
              "Gerade sind viele Anfragen unterwegs. Bitte versuche es in etwa einer Stunde erneut — oder nutze **Option für Option** auf der Auswahlseite."
            );
          }
          setError(null);
        } else {
          setError(data.error ?? "Antwort konnte nicht geladen werden.");
        }
        setLoading(false);
        return;
      }

      const displayText =
        data.displayText?.trim() ||
        "Antwort konnte nicht geladen werden. Bitte noch einmal versuchen.";

      if (data.typ === "off_topic") {
        appendAssistant(displayText);
        setLoading(false);
        return;
      }

      if (data.typ === "bekannt" && data.parsed?.typ === "bekannt") {
        const p = data.parsed as KiParsedBekannt;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Super — ich habe ein klares Bild von deinem Vorhaben.\n\nTippe unten auf **Zum Preis**, dann siehst du deinen unverbindlichen Preisrahmen.",
          },
        ]);
        setLoading(false);
        onPreisBereit({
          situation: p.situation,
          bereiche: p.bereiche,
          groesse: p.groesse,
          plz: p.plz,
          zeitraum: p.zeitraum,
          kundentyp: p.kundentyp,
          fachdetails: p.fachdetails,
          ki_session_id: sessionId,
          ki_chat_verlauf: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });
        return;
      }

      if (data.typ === "unbekannt" || data.typ === "zu_komplex") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `${displayText}\n\nTippe unten auf **Zur Beratung**, dann kannst du uns deine Kontaktdaten hinterlassen.`,
          },
        ]);
        setLoading(false);
        onBeratungBereit();
        return;
      }

      appendAssistant(displayText);
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    locked,
    limitReached,
    messages,
    onPreisBereit,
    onBeratungBereit,
    sessionId,
    syncTextareaHeight,
    appendAssistant,
  ]);

  const inputDisabled = loading || locked || limitReached;

  return (
    <div
      ref={chatRootRef}
      className={cn(
        "ki-rechner-chat",
        locked && "ki-rechner-chat--locked"
      )}
    >
      <div className="ki-rechner-chat-header">
        <div className="ki-rechner-chat-avatar">
          <Image
            src="/logo-mark-green.png"
            alt=""
            width={32}
            height={32}
            className="ki-rechner-chat-logo"
          />
        </div>
        <div>
          <div className="ki-rechner-chat-title">
            Bärenwald{" "}
            <span className="ki-rechner-mode-label ki-rechner-mode-label--chat">
              BärenwaldGPT
            </span>
          </div>
          <div className="ki-rechner-chat-sub">
            Beratung · Planung · Preisrahmen
          </div>
        </div>
      </div>

      <div ref={messagesScrollRef} className="ki-rechner-chat-messages">
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${i}`}
            className={
              msg.role === "user"
                ? "ki-rechner-chat-row ki-rechner-chat-row--user"
                : "ki-rechner-chat-row ki-rechner-chat-row--assistant"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "ki-rechner-chat-bubble ki-rechner-chat-bubble--user"
                  : "ki-rechner-chat-bubble ki-rechner-chat-bubble--assistant"
              }
            >
              {renderChatContent(msg.content)}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="ki-rechner-chat-row ki-rechner-chat-row--assistant">
            <div className="ki-rechner-chat-bubble ki-rechner-chat-bubble--assistant ki-rechner-chat-typing">
              <span className="ki-rechner-chat-dot" />
              <span className="ki-rechner-chat-dot" />
              <span className="ki-rechner-chat-dot" />
            </div>
          </div>
        ) : null}

        {limitReached ? (
          <p className="ki-rechner-chat-limit" role="status">
            Limit erreicht ({KI_MAX_USER_MESSAGES} Nachrichten). Bitte unten auf{" "}
            <strong>Zum Preis</strong> oder <strong>Zur Beratung</strong> tippen.
          </p>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <p className="ki-rechner-chat-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ki-rechner-chat-composer">
        <div
          className={cn(
            "ki-rechner-chat-inputbar",
            limitReached && "ki-rechner-chat-inputbar--disabled"
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              limitReached
                ? "Nachrichtenlimit erreicht"
                : "Vorhaben eingeben …"
            }
            className="ki-rechner-chat-input ki-rechner-chat-textarea"
            disabled={inputDisabled}
            aria-label="Nachricht an den Bärenwald Handwerks-Assistenten"
            aria-describedby={limitReached ? "ki-chat-limit-hint" : undefined}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || inputDisabled}
            className="ki-rechner-chat-send"
            aria-label="Nachricht senden"
          >
            <SendMessageIcon />
          </button>
        </div>
        <p className="ki-rechner-chat-privacy">
          Nachrichten werden zur Antwort an einen KI-Dienst (Anthropic) übermittelt und
          protokolliert.{" "}
          <Link href="/datenschutz#ki-beratung">Datenschutz</Link>
        </p>
      </div>
      {limitReached ? (
        <span id="ki-chat-limit-hint" className="sr-only">
          Maximal {KI_MAX_USER_MESSAGES} Nachrichten pro Chat.
        </span>
      ) : null}
    </div>
  );
}
