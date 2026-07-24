"use client";

import { useState } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

export type PushPermissionRole = "kunde" | "hv" | "handwerker" | "eigentuemer";

const COPY: Record<
  PushPermissionRole,
  { title: string; body: string; allow: string; later: string }
> = {
  kunde: {
    title: "Benachrichtigungen zu Ihren Vorgängen",
    body: "Wir benachrichtigen Sie zu Angeboten, Terminen und dem Fortschritt Ihrer Aufträge. Kein Marketing — nur relevante Status-Updates.",
    allow: "Benachrichtigungen erlauben",
    later: "Später entscheiden",
  },
  hv: {
    title: "Benachrichtigungen für Ihre Verwaltung",
    body: "Erhalten Sie Hinweise zu neuen Meldungen, Freigaben und Bautagebuch-Einträgen Ihrer Handwerker — damit nichts liegen bleibt.",
    allow: "Benachrichtigungen erlauben",
    later: "Später entscheiden",
  },
  handwerker: {
    title: "Benachrichtigungen zu Aufträgen",
    body: "Wir informieren Sie über neue Anfragen, Terminänderungen und Dokumentations-Anforderungen. So verpassen Sie keinen Einsatz.",
    allow: "Benachrichtigungen erlauben",
    later: "Später entscheiden",
  },
  eigentuemer: {
    title: "Benachrichtigungen zu Ihren Objekten",
    body: "Status zu Freigaben und laufenden Vorgängen an Ihren Objekten — ohne Werbung.",
    allow: "Benachrichtigungen erlauben",
    later: "Später entscheiden",
  },
};

const STORAGE_KEY = "portal_push_rationale_v1";

type Props = {
  role?: PushPermissionRole;
  className?: string;
  /** Kompakt in Einstellungen */
  embedded?: boolean;
  onDecision?: (allowed: boolean) => void;
};

/**
 * E1 — Pre-permission Rationale vor dem OS-Push-Dialog.
 * Stub/UI: speichert Entscheidung lokal; OS-Permission nur wenn Notification API da.
 */
export function PortalPushPermissionRationale({
  role = "kunde",
  className,
  embedded = false,
  onDecision,
}: Props) {
  const copy = COPY[role];
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "done";
    } catch {
      return false;
    }
  });

  if (dismissed && !embedded) return null;

  async function decide(allow: boolean) {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setDismissed(true);
    onDecision?.(allow);

    if (allow && typeof window !== "undefined" && "Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          portalToastSuccess("Benachrichtigungen aktiviert.");
        } else {
          portalToastSuccess("Einstellung gespeichert.");
        }
      } catch {
        portalToastSuccess("Einstellung gespeichert.");
      }
    } else if (!allow) {
      portalToastSuccess("Später erinnern — Sie können das in den Einstellungen ändern.");
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl p-4",
        embedded ? "border bg-white" : "border bg-[#F6F7F6]",
        className
      )}
      style={{ borderColor: PORTAL_VAR.line }}
      data-testid="push-permission-rationale"
    >
      <p
        className="text-[14px] font-bold"
        style={{
          color: PORTAL_VAR.ink,
          fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
        }}
      >
        {copy.title}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
        {copy.body}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded-[9px] px-4 py-2.5 text-[13px] font-semibold text-white"
          style={{ background: PORTAL_VAR.primary }}
          onClick={() => void decide(true)}
        >
          {copy.allow}
        </button>
        <button
          type="button"
          className="rounded-[9px] border bg-white px-4 py-2.5 text-[13px] font-semibold"
          style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.sub }}
          onClick={() => void decide(false)}
        >
          {copy.later}
        </button>
      </div>
    </div>
  );
}
