"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { GptStudioChat } from "@/components/gpt/GptStudioChat";
import { cn } from "@/lib/utils";

export function PortalBaerenwaldGpt({
  variant = "overlay",
  open = true,
  onClose,
}: {
  variant?: "overlay" | "embedded";
  open?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();

  if (!open) return null;

  const chat = (
    <GptStudioChat
      locked={false}
      priceHandoff
      onPreisBereit={() => router.push("/portal-tools/rechner?modus=ki")}
      onBeratungBereit={() => router.push("/portal-tools/rechner?modus=ki")}
    />
  );

  if (variant === "embedded") {
    return (
      <div className="portal-gpt-shell portal-gpt-shell--embedded">
        {onClose ? (
          <div className="portal-gpt-shell-bar">
            <button
              type="button"
              onClick={onClose}
              className="portal-gpt-shell-close"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="portal-gpt-shell-title">Bärenwald GPT</p>
          </div>
        ) : null}
        <div className="portal-gpt-body portal-gpt-chat-active">{chat}</div>
      </div>
    );
  }

  return (
    <div className="portal-gpt-shell portal-gpt-shell--overlay fixed inset-0 z-[210] bg-black/45 lg:hidden">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Schließen"
      />
      <article
        className={cn(
          "portal-gpt-shell-panel absolute inset-x-0 bottom-0 top-[8vh] flex flex-col rounded-t-2xl border border-border-default bg-surface-card shadow-xl"
        )}
      >
        <div className="portal-gpt-shell-bar">
          <button
            type="button"
            onClick={onClose}
            className="portal-gpt-shell-close"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="portal-gpt-shell-title">Bärenwald GPT</p>
        </div>
        <div className="portal-gpt-body portal-gpt-chat-active min-h-0 flex-1 overflow-hidden">
          {chat}
        </div>
      </article>
    </div>
  );
}
