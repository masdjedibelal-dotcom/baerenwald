"use client";

import { WHATSAPP_ICON_PATH, WHATSAPP_URL_ANFRAGE } from "@/lib/whatsapp";

export function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL_ANFRAGE}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="WhatsApp schreiben"
    >
      <svg viewBox="0 0 24 24" fill="white" width={28} height={28} aria-hidden>
        <path d={WHATSAPP_ICON_PATH} />
      </svg>
    </a>
  );
}
