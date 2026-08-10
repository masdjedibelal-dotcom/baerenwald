"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

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

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Label + Sparkles → Chat-Sheet → Übernehmen schreibt in das Feld (CRM-Pattern).
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages, pending, draftText]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  function closeChat() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function openChat() {
    if (disabled) return;
    setOpen(true);
    setError(null);
    setDraftText(null);
    setMessages([]);
    setInput("");
  }

  async function send(prompt?: string) {
    const userMessage = (prompt ?? input).trim();
    if (!userMessage || pending) return;
    setInput("");
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
            title={`KI: ${labelText} umschreiben`}
            aria-label={`KI: ${labelText} umschreiben`}
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
        title={`KI · ${cfg.label}`}
        subtitle={cfg.intro}
        variant="edit"
        closeOnBackdrop={!pending}
        busy={pending}
        onConfirm={
          draftText
            ? () => applyDraft(draftText)
            : () => {
                if (input.trim()) void send();
              }
        }
        confirmDisabled={pending || (!draftText && !input.trim())}
        confirmLabel={draftText ? "Übernehmen" : "Senden"}
      >
        <div className="flex min-h-[min(52vh,420px)] flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl border border-border-light bg-[#fafbfa] p-3">
            {messages.length === 0 && !pending ? (
              <div className="space-y-3 py-2">
                <p className="text-[13px] text-text-secondary">{cfg.intro}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cfg.quickPrompts.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      disabled={pending}
                      onClick={() => void send(q.prompt)}
                      className="rounded-full border border-border-default bg-white px-2.5 py-1 text-[12px] font-semibold text-text-primary"
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
                    "max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-[var(--org-primary,var(--p2-primary,#2e7d52))] text-white"
                      : "mr-auto border border-border-light bg-white text-text-primary"
                  )}
                >
                  <p className="whitespace-pre-wrap">{display}</p>
                </div>
              );
            })}

            {pending ? (
              <div
                className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 text-[12px] text-text-secondary"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Schreibt …
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {draftText ? (
            <div className="rounded-xl border border-[var(--org-primary,var(--p2-primary,#2e7d52))]/25 bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))]/60 p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Vorschlag zum Übernehmen
              </p>
              <p className="mb-2.5 whitespace-pre-wrap text-[13px] text-text-primary">
                {draftText}
              </p>
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
            <p className="text-[12px] font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              disabled={pending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={cfg.placeholder}
              className="portal-input min-h-[44px] flex-1 resize-none rounded-xl border border-border-default px-3 py-2.5 text-[13px]"
            />
            <button
              type="button"
              disabled={pending || !input.trim()}
              onClick={() => void send()}
              className="btn-pill-filled portal-btn shrink-0 self-end disabled:opacity-50"
            >
              Senden
            </button>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={closeChat}
            className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-text-secondary"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Schließen
          </button>
        </div>
      </PortalModalShell>
    </div>
  );
}
