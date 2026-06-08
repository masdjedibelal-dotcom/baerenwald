"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { GptProjektBriefPanel } from "@/components/gpt/GptProjektBrief";
import { GptProjektProvider, useGptProjekt } from "@/components/gpt/gpt-projekt-context";
import { GptRaumVisualisierung } from "@/components/gpt/GptRaumVisualisierung";
import { KiRechnerChat, type KiRechnerChatMessage } from "@/components/funnel/KiRechnerChat";
import { PortalMobileSheetHeader } from "@/components/shared/PortalMobileBottomSheet";
import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";
import { cn } from "@/lib/utils";

import "./portal-gpt.css";
import "@/components/gpt/gpt-viz.css";

type PortalBaerenwaldGptProps = {
  open: boolean;
  onClose: () => void;
  variant?: "overlay" | "embedded";
};

type GptTab = "beratung" | "visualisieren" | "projekt";

function PortalBaerenwaldGptInner({
  open,
  onClose,
  variant = "overlay",
}: PortalBaerenwaldGptProps) {
  const [activeTab, setActiveTab] = useState<GptTab>("beratung");
  const [kiChatLocked, setKiChatLocked] = useState(false);
  const [preisCtaVisible, setPreisCtaVisible] = useState(false);
  const [beratungCtaVisible, setBeratungCtaVisible] = useState(false);
  const [showVizCta, setShowVizCta] = useState(false);
  const { mergeChatVerlauf, ensureSession } = useGptProjekt();
  const isEmbedded = variant === "embedded";

  useEffect(() => {
    if (!open || isEmbedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isEmbedded]);

  const handlePreisBereit = useCallback(() => {
    setPreisCtaVisible(true);
    setBeratungCtaVisible(false);
    setKiChatLocked(true);
  }, []);

  const handleBeratungBereit = useCallback(() => {
    setBeratungCtaVisible(true);
    setPreisCtaVisible(false);
    setKiChatLocked(true);
  }, []);

  const handleClose = useCallback(() => {
    setKiChatLocked(false);
    setPreisCtaVisible(false);
    setBeratungCtaVisible(false);
    onClose();
  }, [onClose]);

  const handleChatVerlaufChange = useCallback(
    (messages: KiRechnerChatMessage[]) => {
      const userCount = messages.filter((m) => m.role === "user").length;
      setShowVizCta(userCount >= 2);
      void mergeChatVerlauf(messages);
    },
    [mergeChatVerlauf]
  );

  const handleRaumVisualisieren = useCallback(async () => {
    await ensureSession();
    setActiveTab("visualisieren");
  }, [ensureSession]);

  if (!open) return null;

  const shell = (
    <div className="portal-gpt-shell">
      <nav className="portal-gpt-tabs" aria-label="Bärenwald GPT Bereiche">
        <button
          type="button"
          className={cn(
            "portal-gpt-tab",
            activeTab === "beratung" && "portal-gpt-tab--active"
          )}
          onClick={() => setActiveTab("beratung")}
        >
          Beratung
        </button>
        <button
          type="button"
          className={cn(
            "portal-gpt-tab",
            activeTab === "visualisieren" && "portal-gpt-tab--active"
          )}
          onClick={() => void handleRaumVisualisieren()}
        >
          Raum visualisieren
        </button>
        <button
          type="button"
          className={cn(
            "portal-gpt-tab",
            activeTab === "projekt" && "portal-gpt-tab--active"
          )}
          onClick={() => setActiveTab("projekt")}
        >
          Mein Projekt
        </button>
      </nav>

      {activeTab === "beratung" && showVizCta ? (
        <div className="portal-gpt-viz-cta">
          <span>Raum zeigen? Visualisiere dein Projekt mit Foto.</span>
          <button type="button" onClick={() => void handleRaumVisualisieren()}>
            Foto hinzufügen
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "portal-gpt-body",
          activeTab === "beratung" && "portal-gpt-chat-active",
          isEmbedded && "portal-gpt-body--embedded"
        )}
      >
        {activeTab === "beratung" ? (
          <KiRechnerChat
            locked={kiChatLocked}
            onPreisBereit={handlePreisBereit}
            onBeratungBereit={handleBeratungBereit}
            onChatVerlaufChange={handleChatVerlaufChange}
            onRaumVisualisieren={() => void handleRaumVisualisieren()}
          />
        ) : null}
        {activeTab === "visualisieren" ? (
          <GptRaumVisualisierung
            onBeratung={() => setActiveTab("beratung")}
            initialStep="einstieg"
          />
        ) : null}
        {activeTab === "projekt" ? (
          <GptProjektBriefPanel
            onAnfrage={() => setActiveTab("visualisieren")}
            onVisualisieren={() => void handleRaumVisualisieren()}
          />
        ) : null}
      </div>

      <footer className="portal-gpt-footer">
        <div className="portal-gpt-footer-actions">
          {activeTab === "beratung" && preisCtaVisible ? (
            <a
              href={RECHNER_KI_BERATUNG_HREF}
              target="_blank"
              rel="noreferrer"
              className="btn-pill-primary portal-btn !px-4 !py-3"
            >
              Zum Preisrahmen
            </a>
          ) : null}
          {activeTab === "beratung" && beratungCtaVisible ? (
            <a
              href="/rechner"
              target="_blank"
              rel="noreferrer"
              className="btn-pill-outline portal-btn !px-4 !py-3"
            >
              Zur Beratung
            </a>
          ) : null}
        </div>
        {!isEmbedded ? (
          <button
            type="button"
            onClick={handleClose}
            className="portal-gpt-close"
            aria-label="Chat schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </footer>
    </div>
  );

  if (isEmbedded) {
    return <div className="portal-gpt-embedded">{shell}</div>;
  }

  return (
    <div
      className="portal-gpt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="GPT"
    >
      <button
        type="button"
        className="portal-gpt-overlay-backdrop lg:hidden"
        onClick={handleClose}
        aria-label="Schließen"
      />
      <div className="portal-gpt-sheet">
        <div className="shrink-0 bg-surface-card lg:hidden">
          <PortalMobileSheetHeader onClose={handleClose} />
        </div>
        {shell}
      </div>
    </div>
  );
}

export function PortalBaerenwaldGpt(props: PortalBaerenwaldGptProps) {
  return (
    <GptProjektProvider>
      <PortalBaerenwaldGptInner {...props} />
    </GptProjektProvider>
  );
}
