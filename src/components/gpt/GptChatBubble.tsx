"use client";

import { useRef } from "react";

import { GptChatImageCard } from "@/components/gpt/GptChatImageCard";
import { GptChatLeadInline } from "@/components/gpt/GptChatLeadInline";
import { renderChatMarkdown } from "@/components/gpt/gpt-chat-markdown";
import type { GptChatMessage } from "@/components/gpt/gpt-chat-types";

type GptChatBubbleProps = {
  message: GptChatMessage;
  onAction?: (actionId: string) => void;
  onUpload?: (kind: "raum" | "inspiration", file: File) => void;
  sessionId?: string | null;
  onLeadSuccess?: () => void;
  disabled?: boolean;
};

export function GptChatBubble({
  message,
  onAction,
  onUpload,
  sessionId,
  onLeadSuccess,
  disabled,
}: GptChatBubbleProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isUser = message.role === "user";

  const bubbleClass = isUser
    ? "ki-rechner-chat-bubble ki-rechner-chat-bubble--user"
    : "ki-rechner-chat-bubble ki-rechner-chat-bubble--assistant gpt-chat-bubble-rich";

  return (
    <div
      className={
        isUser
          ? "ki-rechner-chat-row ki-rechner-chat-row--user"
          : "ki-rechner-chat-row ki-rechner-chat-row--assistant"
      }
    >
      <div className={bubbleClass}>
        {message.text ? renderChatMarkdown(message.text) : null}

        {message.image ? <GptChatImageCard image={message.image} /> : null}

        {message.compare ? (
          <div className="gpt-chat-compare">
            <GptChatImageCard image={message.compare.before} compact />
            <GptChatImageCard image={message.compare.after} compact />
          </div>
        ) : null}

        {message.kind === "upload" && message.uploadKind && onUpload ? (
          <div className="gpt-chat-upload">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(message.uploadKind!, f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="gpt-viz-btn gpt-viz-btn--primary"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
            >
              {message.uploadKind === "raum" ? "Raumfoto hochladen" : "Inspirationsbild hochladen"}
            </button>
          </div>
        ) : null}

        {message.actions && message.actions.length > 0 && onAction ? (
          <div className="gpt-chat-actions">
            {message.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                className={
                  a.variant === "primary"
                    ? "gpt-viz-btn gpt-viz-btn--primary gpt-chat-action-btn"
                    : "gpt-viz-btn gpt-viz-btn--outline gpt-chat-action-btn"
                }
                onClick={() => onAction(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

        {message.kind === "lead_form" && sessionId && onLeadSuccess ? (
          <GptChatLeadInline sessionId={sessionId} onSuccess={onLeadSuccess} />
        ) : null}
      </div>
    </div>
  );
}
