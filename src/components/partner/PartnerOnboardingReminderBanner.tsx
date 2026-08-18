"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

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
        "border-[rgba(138,90,6,0.2)] bg-[#FBF1D6] text-[#5C4408]",
        isChip
          ? "rounded-full px-2.5 py-1.5"
          : "rounded-[10px] px-3 py-2"
      )}
    >
      <button
        type="button"
        onClick={goSettings}
        className="min-w-0 flex-1 text-left"
      >
        {isChip ? (
          <p className="truncate text-[12px] font-medium leading-snug tracking-tight">
            Offen: {parts.join(" · ")}
          </p>
        ) : (
          <>
            <p className="text-[13px] font-semibold leading-snug tracking-tight">
              Noch offen für Angebot & Rechnung
            </p>
            <p className="mt-0.5 text-[12px] leading-snug opacity-90">
              {parts.join(" · ")}. Tippen für Einstellungen.
            </p>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hinweis ausblenden"
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[16px] leading-none",
          "text-[#8A5A06]/70 hover:bg-[rgba(138,90,6,0.1)] hover:text-[#8A5A06]"
        )}
      >
        ×
      </button>
    </div>
  );
}
