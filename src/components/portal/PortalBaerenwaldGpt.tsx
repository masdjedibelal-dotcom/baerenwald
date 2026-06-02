"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { KiRechnerChat } from "@/components/funnel/KiRechnerChat";
import { RECHNER_KI_BERATUNG_HREF } from "@/lib/rechner-links";

import "./portal-gpt.css";

type PortalBaerenwaldGptProps = {
  open: boolean;
  onClose: () => void;
};

export function PortalBaerenwaldGpt({ open, onClose }: PortalBaerenwaldGptProps) {
  const [kiChatLocked, setKiChatLocked] = useState(false);
  const [preisCtaVisible, setPreisCtaVisible] = useState(false);
  const [beratungCtaVisible, setBeratungCtaVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  return (
    <div
      className="portal-gpt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="BärenwaldGPT"
    >
      <div className="portal-gpt-shell">
        <header className="portal-gpt-header">
          <div className="flex items-center gap-2">
            <Image src="/logo-mark-green.png" alt="" width={22} height={22} />
            <div>
              <p className="text-sm font-semibold leading-tight text-text-primary">
                <span className="font-display italic text-accent">GPT</span>
                <span className="ml-1">· Kundenportal</span>
              </p>
              <p className="text-[11px] text-text-tertiary">
                Beratung für dein Vorhaben
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border-default bg-surface-card text-text-secondary"
            aria-label="Chat schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="portal-gpt-body portal-gpt-chat-active">
          <KiRechnerChat
            locked={kiChatLocked}
            onPreisBereit={handlePreisBereit}
            onBeratungBereit={handleBeratungBereit}
          />
        </div>

        <footer className="portal-gpt-footer">
          {preisCtaVisible ? (
            <a
              href={RECHNER_KI_BERATUNG_HREF}
              target="_blank"
              rel="noreferrer"
              className="btn-pill-primary !px-4 !py-2.5 !text-[13px]"
            >
              Zum Preisrahmen
            </a>
          ) : null}
          {beratungCtaVisible ? (
            <a
              href="/rechner"
              target="_blank"
              rel="noreferrer"
              className="btn-pill-outline !px-4 !py-2.5 !text-[13px]"
            >
              Zur Beratung
            </a>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className="btn-pill-outline !px-4 !py-2.5 !text-[13px]"
          >
            Schließen
          </button>
        </footer>
      </div>
    </div>
  );
}
