"use client";

import Link from "next/link";
import { Info } from "lucide-react";

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
      className="portal-text-body flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5 text-amber-950"
      role="status"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-amber-950">{title}</p>
          <Link
            href={EINSTELLUNGEN_HREF}
            className="portal-text-meta shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline"
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
        <p className="mt-1 text-[13px] leading-snug text-amber-900/90">{body}</p>
      </div>
    </div>
  );
}
