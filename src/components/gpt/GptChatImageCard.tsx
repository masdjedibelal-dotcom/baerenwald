"use client";

import { Download } from "lucide-react";

import { downloadChatImage } from "@/lib/gpt-viz/download-image";

import type { GptChatImageRef } from "./gpt-chat-types";

type GptChatImageCardProps = {
  image: GptChatImageRef;
  compact?: boolean;
};

export function GptChatImageCard({ image, compact }: GptChatImageCardProps) {
  return (
    <figure className={compact ? "gpt-chat-image gpt-chat-image--compact" : "gpt-chat-image"}>
      <figcaption className="gpt-chat-image-label">{image.label}</figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.label} className="gpt-chat-image-img" />
      <button
        type="button"
        className="gpt-chat-download-btn"
        onClick={() => void downloadChatImage(image.url, image.downloadName)}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Herunterladen
      </button>
    </figure>
  );
}
