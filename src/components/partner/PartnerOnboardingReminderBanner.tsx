"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { PortalButton } from "@/components/portal/PortalButton";

import {
  dismissPartnerOnboardingBanner,
  isPartnerOnboardingBannerDismissed,
  resolvePartnerOnboardingGaps,
} from "@/lib/partner/partner-onboarding-gaps";
import type {
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
} from "@/lib/partner/get-partner-data";
import { einstellungenNavStorageKey } from "@/lib/portal2/einstellungen-nav";
import { cn } from "@/lib/utils";

type Props = {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
  /** Auf Einstellungen-Seite ausblenden. */
  hidden?: boolean;
  /**
   * `chip` — eine Zeile, unter Hero/Begrüßung.
   * `banner` — etwas mehr Text (andere Sektionen ohne Hero).
   */
  variant?: "chip" | "banner";
};

/**
 * Reminder: Handwerkskarte + Firmendaten.
 * Wegklickbar → wieder nach 3 Tagen, bis beides erledigt.
 */
export function PartnerOnboardingReminderBanner({
  handwerker,
  profil,
  hidden = false,
  variant = "chip",
}: Props) {
  const router = useRouter();
  const gaps = useMemo(
    () => resolvePartnerOnboardingGaps({ handwerker, profil }),
    [handwerker, profil]
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hidden || !gaps.show) {
      setVisible(false);
      return;
    }
    setVisible(!isPartnerOnboardingBannerDismissed(handwerker.email));
  }, [hidden, gaps.show, handwerker.email]);

  if (!visible || !gaps.show) return null;

  const parts: string[] = [];
  if (gaps.handwerkskarteFehlt) parts.push("Handwerkskarte");
  if (gaps.firmendatenFehlen) {
    parts.push(
      gaps.missingFirmendaten.length
        ? `Firmendaten (${gaps.missingFirmendaten.slice(0, 2).join(", ")}${
            gaps.missingFirmendaten.length > 2 ? " …" : ""
          })`
        : "Firmendaten"
    );
  }

  function goSettings() {
    try {
      sessionStorage.setItem(
        einstellungenNavStorageKey("handwerker"),
        gaps.preferredTab
      );
    } catch {
      /* ignore */
    }
    router.push("/partner?section=profil");
  }

  function onDismiss(e: MouseEvent) {
    e.stopPropagation();
    dismissPartnerOnboardingBanner(handwerker.email);
    setVisible(false);
  }

  const isChip = variant === "chip";

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-1.5 border",
        "border-[rgba(138,90,6,0.2)] bg-[var(--p2-status-sand-bg)] text-[var(--p2-sand-ink)]",
        isChip
          ? "rounded-pill px-2.5 py-1.5"
          : "rounded-[10px] px-3 py-2"
      )}
    >
      <PortalButton
        variant="ghost"
        type="button"
        onClick={goSettings}
        className="min-w-0 flex-1 text-left"
      >
        {isChip ? (
          <p className="truncate text-fs-caption font-medium leading-snug tracking-tight">
            Offen: {parts.join(" · ")}
          </p>
        ) : (
          <>
            <p className="text-fs-meta font-semibold leading-snug tracking-tight">
              Noch offen für Angebot & Rechnung
            </p>
            <p className="mt-0.5 text-fs-caption leading-snug opacity-90">
              {parts.join(" · ")}. Tippen für Einstellungen.
            </p>
          </>
        )}
      </PortalButton>
      <PortalButton
        variant="ghost"
        type="button"
        onClick={onDismiss}
        aria-label="Hinweis ausblenden"
        className={cn(
          "shrink-0 rounded-pill px-1.5 py-0.5 text-fs-title leading-none",
          "text-[var(--p2-sand-text)]/70 hover:bg-[rgba(138,90,6,0.1)] hover:text-[var(--p2-sand-text)]"
        )}
      >
        ×
      </PortalButton>
    </div>
  );
}
