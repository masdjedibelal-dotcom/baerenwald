"use client";

import { ChatGuidedBlocks } from "@/components/gpt/chat/ChatGuidedBlocks";
import { GptZielbildCard } from "@/components/gpt/GptZielbildCard";
import { renderChatMarkdown } from "@/components/gpt/gpt-chat-markdown";
import type { GptChatMessage } from "@/components/gpt/gpt-chat-types";
import type { GptLeadDraft } from "@/lib/gpt-viz/lead-collect";

type GptChatBubbleProps = {
  message: GptChatMessage;
  onAction?: (actionId: string) => void;
  onLeadSubmit?: (draft: GptLeadDraft) => void;
  disabled?: boolean;
  /** Journey-Bar oben zeigt Summary — Chips in Bubbles ausblenden. */
  suppressSummaryBlocks?: boolean;
};

export function GptChatBubble({
  message,
  onAction,
  onLeadSubmit,
  disabled,
  suppressSummaryBlocks = false,
}: GptChatBubbleProps) {
  const isUser = message.role === "user";
  const blocks =
    suppressSummaryBlocks && message.blocks
      ? message.blocks.filter((b) => b.type !== "summary")
      : message.blocks;

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
              erklaerung={message.compare.erklaerung}
              zielbildUrl={message.compare.zielbild_url}
              className="gpt-chat-zielbild"
            />
          </div>
        ) : null}

        {blocks && blocks.length > 0 && onAction ? (
          <ChatGuidedBlocks
            blocks={blocks}
            onAction={onAction}
            onLeadSubmit={onLeadSubmit}
            disabled={disabled}
          />
        ) : null}

        {message.actions && message.actions.length > 0 && onAction ? (
          <div className="gpt-chat-cta-row">
            {message.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                className="gpt-chat-cta-btn"
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
