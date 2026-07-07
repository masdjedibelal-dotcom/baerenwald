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
      onPreisBereit={() => router.push("/rechner?modus=ki")}
      onBeratungBereit={() => router.push("/rechner?modus=ki")}
    />
  );

  if (variant === "embedded") {
    return (
      <div className="flex min-h-[min(70vh,640px)] flex-col">
        {onClose ? (
          <div className="flex justify-end border-b border-border-light px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-text-secondary hover:bg-muted"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1">{chat}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] bg-black/45 lg:hidden">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Schließen"
      />
      <article
        className={cn(
          "absolute inset-x-0 bottom-0 top-[8vh] flex flex-col rounded-t-2xl border border-border-default bg-surface-card shadow-xl"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-light px-4 py-3">
          <p className="font-semibold text-text-primary">Bärenwald GPT</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:bg-muted"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{chat}</div>
      </article>
    </div>
  );
}
