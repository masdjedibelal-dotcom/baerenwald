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
};

/**
 * Reminder oben im Partner-Portal: Handwerkskarte + Firmendaten.
 * Wegklickbar → wieder nach 3 Tagen, bis beides erledigt.
 */
export function PartnerOnboardingReminderBanner({
  handwerker,
  profil,
  hidden = false,
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
  if (gaps.handwerkskarteFehlt) parts.push("Handwerkskarte hochladen");
  if (gaps.firmendatenFehlen) {
    parts.push(
      gaps.missingFirmendaten.length
        ? `Firmendaten ergänzen (${gaps.missingFirmendaten.slice(0, 3).join(", ")}${
            gaps.missingFirmendaten.length > 3 ? " …" : ""
          })`
        : "Firmendaten für Angebot & Rechnung ergänzen"
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

  return (
    <div
      role="status"
      className={cn(
        "flex items-stretch gap-2 rounded-[10px] border px-3 py-2.5 sm:px-4",
        "border-[rgba(138,90,6,0.22)] bg-[#FBF1D6] text-[#5C4408]"
      )}
    >
      <button
        type="button"
        onClick={goSettings}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-[13px] font-semibold leading-snug tracking-tight">
          Noch offen für Angebot & Rechnung
        </p>
        <p className="mt-0.5 text-[12px] leading-snug opacity-90">
          {parts.join(" · ")}. Tippen für Einstellungen.
        </p>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hinweis ausblenden"
        className={cn(
          "shrink-0 self-start rounded-md px-2 py-1 text-[18px] leading-none",
          "text-[#8A5A06]/70 hover:bg-[rgba(138,90,6,0.1)] hover:text-[#8A5A06]"
        )}
      >
        ×
      </button>
    </div>
  );
}
