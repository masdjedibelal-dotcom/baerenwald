"use client";

import { GptChatLeadInline } from "@/components/gpt/GptChatLeadInline";
import { GptZielbildCard } from "@/components/gpt/GptZielbildCard";
import { renderChatMarkdown } from "@/components/gpt/gpt-chat-markdown";
import type { GptChatMessage } from "@/components/gpt/gpt-chat-types";

type GptChatBubbleProps = {
  message: GptChatMessage;
  onAction?: (actionId: string) => void;
  sessionId?: string | null;
  onLeadSuccess?: () => void;
  disabled?: boolean;
};

export function GptChatBubble({
  message,
  onAction,
  sessionId,
  onLeadSuccess,
  disabled,
}: GptChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={
        isUser
          ? "ki-rechner-chat-row ki-rechner-chat-row--user"
          : "ki-rechner-chat-row ki-rechner-chat-row--assistant"
      }
    >
      <div
        className={
          isUser
            ? "ki-rechner-chat-bubble ki-rechner-chat-bubble--user"
            : "ki-rechner-chat-bubble ki-rechner-chat-bubble--assistant"
        }
      >
        {message.text ? renderChatMarkdown(message.text) : null}

        {message.userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.userImage.url}
            alt={message.userImage.label}
            className="gpt-chat-user-thumb"
          />
        ) : null}

        {message.compare ? (
          <div className="gpt-chat-embed">
            <GptZielbildCard
              vorherUrl={message.compare.before.url}
              nachherUrl={message.compare.after.url}
              beschreibung={message.compare.beschreibung ?? ""}
              className="gpt-chat-zielbild"
            />
          </div>
        ) : null}

        {message.showLeadForm && sessionId && onLeadSuccess ? (
          <GptChatLeadInline sessionId={sessionId} onSuccess={onLeadSuccess} />
        ) : null}

        {message.actions && message.actions.length > 0 && onAction ? (
          <div className="gpt-chat-inline-actions">
            {message.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                className="gpt-chat-inline-action"
                onClick={() => onAction(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
