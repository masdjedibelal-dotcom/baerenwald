"use client";

import { WHATSAPP_URL_ANFRAGE } from "@/lib/whatsapp";
import { SiteIcon } from "@/components/ui/SiteIcon";

export function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL_ANFRAGE}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="WhatsApp schreiben"
    >
      <SiteIcon
        asset="brand-whatsapp"
        size={28}
        style={{ filter: "brightness(0) invert(1)" }}
      />
    </a>
  );
}
