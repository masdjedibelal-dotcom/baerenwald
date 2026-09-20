"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import Link from "next/link";

import {
  freigabeBypassInfoCopy,
  type FreigabeBypassInfoKind,
} from "@/lib/org/freigabe-bypass";
import { einstellungenNavStorageKey } from "@/lib/portal2/einstellungen-nav";

const EINSTELLUNGEN_HREF = "/portal?section=profil&tab=freigabe";

type Props = {
  kind: FreigabeBypassInfoKind;
  schwelleLabel?: string | null;
};

/**
 * Gelbes Notif-Banner oben im Vorgang: unter Freigabeschwelle / Akut —
 * gleiche Sprache wie PortalDetailInfoBox variant="warning".
 */
export function HvFreigabeInfoBanner({ kind, schwelleLabel }: Props) {
  const { title, body } = freigabeBypassInfoCopy({
    bypassGrund: kind,
    schwelleLabel,
  });

  return (
    <div
      className="portal-text-body flex gap-3 rounded-sheet border border-warning-border bg-warning-bg px-3.5 py-3.5 text-warning-text"
      role="status"
    >
      <PortalIcon n="info-circle" ctx="default" className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-warning-text">{title}</p>
          <Link
            href={EINSTELLUNGEN_HREF}
            className="portal-text-meta inline-flex min-h-[44px] shrink-0 items-center font-semibold text-warning-text underline-offset-2 hover:underline"
            onClick={() => {
              try {
                sessionStorage.setItem(
                  einstellungenNavStorageKey("hv"),
                  "freigabe"
                );
              } catch {
                /* ignore */
              }
            }}
          >
            Einstellungen
          </Link>
        </div>
        <p className="mt-1 text-fs-meta leading-snug text-warning-text/90">{body}</p>
      </div>
    </div>
  );
}
