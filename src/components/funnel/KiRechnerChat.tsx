"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { renderChatMarkdown } from "@/components/gpt/gpt-chat-markdown";
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
  /** Projekt-Studio: Chat-Verlauf an Session hängen. */
  onChatVerlaufChange?: (messages: KiRechnerChatMessage[]) => void;
  /** CTA: Tab Raum visualisieren. */
  onRaumVisualisieren?: () => void;
}

const INITIAL_MESSAGE = `Hi! Ich bin ein KI-Assistent von Bärenwald — für Renovierung, Reparatur und Umbau in München.

Ob erste Idee oder konkretes Projekt: Hier klären wir alles Handwerkliche. Ich helfe dir z. B.:
• zu verstehen, **was du wirklich brauchst** (Gewerke, Ablauf, Stolpersteine)
• bei **Fragen zu deinem Vorhaben** — auch wenn noch vieles offen ist
• zu sehen, **was als Nächstes Sinn macht**

Sind die wichtigsten Punkte da, tippe unten auf **Zum Preis** für einen unverbindlichen Rahmen. Nicht alles musst du sofort wissen.

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

export function KiRechnerChat({
  onPreisBereit,
  onBeratungBereit,
  locked = false,
  onChatVerlaufChange,
  onRaumVisualisieren,
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
    onChatVerlaufChange?.(messages);
  }, [messages, onChatVerlaufChange]);

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
              `Sie haben die maximale Anzahl von **${KI_MAX_USER_MESSAGES} Nachrichten** erreicht. Bitte nutzen Sie **Zum Preis** oder **Zur Beratung** unten.`
            );
          } else {
            appendAssistant(
              "Gerade sind viele Anfragen unterwegs. Bitte versuchen Sie es in etwa einer Stunde erneut — oder nutzen Sie **Option für Option** auf der Auswahlseite."
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
        "Antwort konnte nicht geladen werden. Bitte versuchen Sie es noch einmal.";

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
              "Super — ich habe ein klares Bild von Ihrem Vorhaben.\n\nTippen Sie unten auf **Zum Preis**, dann sehen Sie Ihren unverbindlichen Preisrahmen.",
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
            content: `${displayText}\n\nTippen Sie unten auf **Zur Beratung**, dann können Sie uns Ihre Kontaktdaten hinterlassen.`,
          },
        ]);
        setLoading(false);
        onBeratungBereit();
        return;
      }

      appendAssistant(displayText);
    } catch {
      setError("Verbindungsfehler — bitte versuchen Sie es erneut.");
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
            KI-Assistent · Beratung · Planung · Preisrahmen
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
              {renderChatMarkdown(msg.content)}
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

      {onRaumVisualisieren && countUserMessages(messages) >= 1 ? (
        <div className="portal-gpt-viz-cta" style={{ margin: "0 0.75rem" }}>
          <span>Zeigen Sie uns Ihren Raum — für eine Visualisierung.</span>
          <button type="button" onClick={onRaumVisualisieren}>
            Raum zeigen
          </button>
        </div>
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
                : "Nachricht schreiben…"
            }
            className="ki-rechner-chat-input ki-rechner-chat-textarea"
            disabled={inputDisabled}
            aria-label="Nachricht an den KI-Assistenten"
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
          KI-Assistent · Anthropic ·{" "}
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
