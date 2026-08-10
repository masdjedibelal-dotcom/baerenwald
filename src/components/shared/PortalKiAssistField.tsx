"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Sparkles } from "lucide-react";

import { GptChatVoiceRecorder } from "@/components/gpt/GptChatVoiceRecorder";
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    setMessages([]);
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
          <span className="text-[14px] font-bold text-text-primary">
            {label}
            {required ? (
              <span className="text-red-600" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={openChat}
            title="BärenwaldGPT öffnen"
            aria-label="BärenwaldGPT öffnen"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-white text-[var(--org-primary,var(--p2-primary,#2e7d52))] transition-colors hover:bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        {labelExtra}
      </div>

      {children}

      <PortalModalShell
        open={open}
        onClose={closeChat}
        title="BärenwaldGPT"
        variant="funnel"
        closeOnBackdrop={!pending}
        busy={false}
        className="portal-ki-gpt-shell"
      >
        <div className="portal-ki-gpt-chat">
          <div className="portal-ki-gpt-messages">
            {messages.length === 0 && !pending ? (
              <div className="portal-ki-gpt-empty">
                <div className="portal-ki-gpt-chips">
                  {cfg.quickPrompts.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      disabled={pending}
                      onClick={() => void send(q.prompt)}
                      className="portal-ki-gpt-chip"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

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
                  <p className="whitespace-pre-wrap">{display}</p>
                </div>
              );
            })}

            {pending ? (
              <div
                className="portal-ki-gpt-bubble portal-ki-gpt-bubble--assistant portal-ki-gpt-typing"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Schreibt …
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {draftText ? (
            <div className="portal-ki-gpt-draft">
              <p className="portal-ki-gpt-draft-label">Vorschlag zum Übernehmen</p>
              <p className="portal-ki-gpt-draft-text">{draftText}</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => applyDraft(draftText)}
                className="btn-pill-filled portal-btn w-full sm:w-auto"
              >
                Übernehmen
              </button>
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
                <textarea
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
                <button
                  type="button"
                  disabled={pending || !input.trim()}
                  onClick={() => void send()}
                  className="portal-ki-gpt-send"
                  aria-label="Senden"
                >
                  <SendMessageIcon />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </PortalModalShell>
    </div>
  );
}
