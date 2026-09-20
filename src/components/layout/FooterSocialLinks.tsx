"use client";

import { cn } from "@/lib/utils";
import { WHATSAPP_URL_ANFRAGE } from "@/lib/whatsapp";
import { SiteIcon } from "@/components/ui/SiteIcon";

const ICON = 26;

/** Brand-Icons als Asset: schwarze SVG → weiß via Invert (Footer auf dunklem Grund). */
const brandIconStyle = {
  filter: "brightness(0) invert(1)",
} as const;

export function FooterSocialLinks({
  className,
  secondaryIconsOnly,
}: {
  className?: string;
  secondaryIconsOnly?: boolean;
}) {
  return (
    <div className={cn("footer-social", className)}>
      {!secondaryIconsOnly ? (
        <a
          href={WHATSAPP_URL_ANFRAGE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
        >
          <SiteIcon asset="brand-whatsapp" size={ICON} style={brandIconStyle} />
        </a>
      ) : null}
      <a
        href="https://www.instagram.com/baerenwald_muenchen/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
      >
        <SiteIcon asset="brand-instagram" size={ICON} style={brandIconStyle} />
      </a>
      <a
        href="https://share.google/LzY5wwX8Su2DJYITP"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Google Business"
      >
        <SiteIcon asset="brand-google" size={ICON} style={brandIconStyle} />
      </a>
    </div>
  );
}
