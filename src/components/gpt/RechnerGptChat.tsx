"use client";

import { GptProjektProvider } from "@/components/gpt/gpt-projekt-context";
import { GptStudioChat } from "@/components/gpt/GptStudioChat";
import type { KiRechnerFunnelData } from "@/components/funnel/KiRechnerChat";

import "@/components/gpt/gpt-viz.css";

type RechnerGptChatProps = {
  locked?: boolean;
  onPreisBereit: (data: KiRechnerFunnelData) => void;
  onBeratungBereit: () => void;
};

export function RechnerGptChat({
  locked = false,
  onPreisBereit,
  onBeratungBereit,
}: RechnerGptChatProps) {
  return (
    <GptProjektProvider>
      <div className="rechner-gpt-chat">
        <GptStudioChat
          priceHandoff
          locked={locked}
          onPreisBereit={onPreisBereit}
          onBeratungBereit={onBeratungBereit}
        />
      </div>
    </GptProjektProvider>
  );
}
