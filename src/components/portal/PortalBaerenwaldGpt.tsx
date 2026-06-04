"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { KiRechnerChat } from "@/components/funnel/KiRechnerChat";
import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";
import { cn } from "@/lib/utils";

import "./portal-gpt.css";

type PortalBaerenwaldGptProps = {
  open: boolean;
  onClose: () => void;
  variant?: "overlay" | "embedded";
};

export function PortalBaerenwaldGpt({
  open,
  onClose,
  variant = "overlay",
}: PortalBaerenwaldGptProps) {
  const [kiChatLocked, setKiChatLocked] = useState(false);
  const [preisCtaVisible, setPreisCtaVisible] = useState(false);
  const [beratungCtaVisible, setBeratungCtaVisible] = useState(false);
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

  if (!open) return null;

  const shell = (
    <div className="portal-gpt-shell">
      <div
        className={cn(
          "portal-gpt-body portal-gpt-chat-active",
          isEmbedded && "portal-gpt-body--embedded"
        )}
      >
        <KiRechnerChat
          locked={kiChatLocked}
          onPreisBereit={handlePreisBereit}
          onBeratungBereit={handleBeratungBereit}
        />
      </div>

      <footer className="portal-gpt-footer">
        <div className="portal-gpt-footer-actions">
          {preisCtaVisible ? (
            <a
              href={RECHNER_KI_BERATUNG_HREF}
              target="_blank"
              rel="noreferrer"
              className="btn-pill-primary portal-btn !px-4 !py-3"
            >
              Zum Preisrahmen
            </a>
          ) : null}
          {beratungCtaVisible ? (
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
      aria-label="BärenwaldGPT"
    >
      {shell}
    </div>
  );
}
