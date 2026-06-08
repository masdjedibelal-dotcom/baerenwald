"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { GptChatImageCard } from "@/components/gpt/GptChatImageCard";
import { GptZielbildCard } from "@/components/gpt/GptZielbildCard";
import type { GptProjektBrief } from "@/lib/gpt-viz/types";

type GptChatBriefBarProps = {
  brief: GptProjektBrief | null;
};

export function GptChatBriefBar({ brief }: GptChatBriefBarProps) {
  const [open, setOpen] = useState(false);

  if (!brief) return null;

  const hasContent =
    brief.ist_bilder_urls.length > 0 ||
    brief.ziel_bild_url ||
    brief.ergebnis_bild_url ||
    brief.wunsch_text;

  if (!hasContent) return null;

  return (
    <div className="gpt-chat-brief-bar">
      <button type="button" className="gpt-chat-brief-toggle" onClick={() => setOpen((v) => !v)}>
        <span>Dein Projekt-Brief</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="gpt-chat-brief-body">
          {brief.wunsch_text ? (
            <p>
              <strong>Wunsch:</strong> {brief.wunsch_text}
            </p>
          ) : null}
          {brief.ist_bilder_urls[0] && brief.ergebnis_bild_url ? (
            <GptZielbildCard
              vorherUrl={brief.ist_bilder_urls[0]}
              nachherUrl={brief.ergebnis_bild_url}
              beschreibung={brief.wunsch_text ?? ""}
              className="gpt-chat-zielbild"
            />
          ) : null}
          <div className="gpt-chat-brief-images">
            {brief.ziel_bild_url ? (
              <GptChatImageCard
                image={{
                  url: brief.ziel_bild_url,
                  label: "Inspiration",
                  downloadName: "baerenwald-inspiration.jpg",
                }}
                compact
              />
            ) : null}
            {brief.ist_bilder_urls[0] ? (
              <GptChatImageCard
                image={{
                  url: brief.ist_bilder_urls[0],
                  label: "Dein Raum",
                  downloadName: "baerenwald-raum-ist.jpg",
                }}
                compact
              />
            ) : null}
            {brief.ergebnis_bild_url ? (
              <GptChatImageCard
                image={{
                  url: brief.ergebnis_bild_url,
                  label: "Visualisierung",
                  downloadName: "baerenwald-visualisierung.jpg",
                }}
                compact
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
