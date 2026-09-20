"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PortalTextarea } from "@/components/shared/PortalFormControls";
import { GptChatVoiceRecorder } from "@/components/gpt/GptChatVoiceRecorder";
import { renderChatMarkdown } from "@/components/gpt/gpt-chat-markdown";
import "@/components/gpt/gpt-viz.css";
import "@/components/shared/portal-ki-gpt-chat.css";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  PORTAL_KI_ASSIST_SCOPES,
  stripPortalKiAssistApplyBlock,
  type PortalKiAssistMessage,
  type PortalKiAssistScope,
} from "@/lib/portal/ki-assist";
import { cn } from "@/lib/utils";
import { PortalButton } from "@/components/portal/PortalButton";

type ChatMsg = PortalKiAssistMessage & { id: string };

type Props = {
  scope: PortalKiAssistScope;
  label: ReactNode;
  value: string;
  onApply: (text: string) => void;
  /** Optional: Kontext für die KI (Auftrag, Leistung, Situation …) */
  contextHint?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  /** Zusätzlicher Button-Bereich unter dem Label (z. B. Mikrofon) */
  labelExtra?: ReactNode;
};

const TEXTAREA_MAX_LINES = 5;
const TEXTAREA_LINE_PX = 22;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SendMessageIcon() {
  return (
    <PortalIcon n="send" ctx="default" size={18} />
  );
}

const KI_ASSIST_WELCOME =
  "Ich bin ein KI-Assistent und helfe Ihnen, den Text zu formulieren. Beschreiben Sie kurz, was Sie brauchen — oder tippen Sie einen Vorschlag unten.";

/**
 * Label + Sparkles → GPT-Chat-Sheet → Übernehmen schreibt in das Feld.
 */
export function PortalKiAssistField({
  scope,
  label,
  value,
  onApply,
  contextHint,
  required,
  disabled,
  className,
  children,
  labelExtra,
}: Props) {
  const cfg = PORTAL_KI_ASSIST_SCOPES[scope];
  const labelText = typeof label === "string" ? label : cfg.label;
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = TEXTAREA_LINE_PX * TEXTAREA_MAX_LINES + 16;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages, pending, draftText]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      syncTextareaHeight();
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, syncTextareaHeight]);

  function closeChat() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setVoiceActive(false);
  }

  function openChat() {
    if (disabled) return;
    setOpen(true);
    setError(null);
    setDraftText(null);
    setMessages([
      { id: newId(), role: "assistant", content: KI_ASSIST_WELCOME },
    ]);
    setInput("");
    setVoiceActive(false);
  }

  async function send(prompt?: string) {
    const userMessage = (prompt ?? input).trim();
    if (!userMessage || pending) return;
    setInput("");
    requestAnimationFrame(syncTextareaHeight);
    setError(null);
    setPending(true);
    const nextHistory: ChatMsg[] = [
      ...messages,
      { id: newId(), role: "user", content: userMessage },
    ];
    setMessages(nextHistory);

    try {
      const res = await fetch("/api/portal/ki-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          fieldLabel: labelText,
          currentText: value,
          contextHint: contextHint ?? null,
          messages: messages.map(({ role, content }) => ({ role, content })),
          userMessage,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        draftText?: string | null;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.reply?.trim()) {
        setError(json.error ?? "KI-Antwort fehlgeschlagen.");
        setPending(false);
        return;
      }
      const reply = json.reply.trim();
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: reply },
      ]);
      if (json.draftText?.trim()) {
        setDraftText(json.draftText.trim());
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  function applyDraft(text: string) {
    const t = text.trim();
    if (!t) return;
    onApply(t);
    setOpen(false);
    setDraftText(null);
    setMessages([]);
    setInput("");
    setVoiceActive(false);
  }

  return (
    <div className={cn("space-y-1.5", className)} data-ki-assist-field={fieldId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-fs-body font-bold text-text-primary">
            {label}
            {required ? (
              <span className="text-p2-danger" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </span>
          <PortalButton
            variant="primary"
            type="button"
            disabled={disabled}
            onClick={openChat}
            title="KI-Hilfe öffnen"
            aria-label="KI-Hilfe öffnen"
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-pill border border-border-default bg-white px-2 text-[length:var(--fs-meta)] font-semibold text-[var(--org-primary,var(--p2-primary))] transition-colors hover:bg-[var(--org-primary-soft,var(--p2-primary-soft))] disabled:opacity-50"
          >
            <PortalIcon n="sparkles" ctx="default" className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>KI-Hilfe</span>
          </PortalButton>
        </div>
        {labelExtra}
      </div>

      {children}

      <PortalModalShell
        open={open}
        onClose={closeChat}
        title="KI-Assistent"
        variant="funnel"
        closeOnBackdrop={!pending}
        busy={false}
        className="portal-ki-gpt-shell"
      >
        <div className="portal-ki-gpt-chat">
          <p className="portal-ki-gpt-ai-label" role="status">
            Sie sprechen mit einem KI-Assistenten
          </p>
          <div className="portal-ki-gpt-messages">
            {messages.map((m) => {
              const display =
                m.role === "assistant"
                  ? stripPortalKiAssistApplyBlock(m.content) || m.content
                  : m.content;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "portal-ki-gpt-bubble",
                    m.role === "user"
                      ? "portal-ki-gpt-bubble--user"
                      : "portal-ki-gpt-bubble--assistant"
                  )}
                >
                  {renderChatMarkdown(display)}
                </div>
              );
            })}

            {!messages.some((m) => m.role === "user") && !pending ? (
              <div className="portal-ki-gpt-empty">
                <div className="portal-ki-gpt-chips">
                  {cfg.quickPrompts.map((q) => (
                    <PortalButton
                      variant="ghost"
                      key={q.label}
                      type="button"
                      disabled={pending}
                      onClick={() => void send(q.prompt)}
                      className="portal-ki-gpt-chip"
                    >
                      {q.label}
                    </PortalButton>
                  ))}
                </div>
              </div>
            ) : null}

            {pending ? (
              <div
                className="portal-ki-gpt-bubble portal-ki-gpt-bubble--assistant portal-ki-gpt-typing"
                role="status"
              >
                <PortalIcon n="loader" ctx="default" className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Schreibt …
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {draftText ? (
            <div className="portal-ki-gpt-draft">
              <p className="portal-ki-gpt-draft-label">Vorschlag zum Übernehmen</p>
              <div className="portal-ki-gpt-draft-text">{renderChatMarkdown(draftText)}</div>
              <PortalButton variant="secondary"
                action={false}
                disabled={pending}
                onClick={() => applyDraft(draftText)}
                className="btn-pill-filled w-full sm:w-auto"
              >
                Übernehmen
              </PortalButton>
            </div>
          ) : null}

          {error ? (
            <p className="portal-ki-gpt-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="portal-ki-gpt-composer">
            <div
              className={cn(
                "portal-ki-gpt-inputbar gpt-chat-inputbar",
                voiceActive && "gpt-chat-inputbar--voice"
              )}
            >
              {!voiceActive ? (
                <PortalTextarea
                  ref={inputRef}
                  rows={1}
                  enterKeyHint="send"
                  value={input}
                  disabled={pending}
                  onChange={(e) => {
                    setInput(e.target.value);
                    requestAnimationFrame(syncTextareaHeight);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={cfg.placeholder}
                  className="portal-ki-gpt-textarea"
                  aria-label="Nachricht"
                />
              ) : null}

              {/* Eine Instanz: Mic links idle / Waveform während Aufnahme */}
              <div
                className={cn(
                  "portal-ki-gpt-voice-slot",
                  voiceActive && "portal-ki-gpt-voice-slot--active",
                  !voiceActive && "order-first"
                )}
              >
                <GptChatVoiceRecorder
                  disabled={pending}
                  onActiveChange={setVoiceActive}
                  onTextReady={(text) => {
                    void send(text);
                  }}
                  onError={(message) => setError(message)}
                />
              </div>

              {!voiceActive ? (
                <PortalButton
                  variant="ghost"
                  action={false}
                  type="button"
                  disabled={pending || !input.trim()}
                  onClick={() => void send()}
                  className="portal-ki-gpt-send"
                  aria-label="Senden"
                >
                  <SendMessageIcon />
                </PortalButton>
              ) : null}
            </div>
          </div>
        </div>
      </PortalModalShell>
    </div>
  );
}
