"use client";

import Link from "next/link";

import {
  freigabeBypassInfoCopy,
  type FreigabeBypassInfoKind,
} from "@/lib/org/freigabe-bypass";
import { einstellungenNavStorageKey } from "@/lib/portal2/einstellungen-nav";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

const EINSTELLUNGEN_HREF = "/portal?section=profil&tab=freigabe";

type Props = {
  kind: FreigabeBypassInfoKind;
  schwelleLabel?: string | null;
};

/** Kompakter Info-Banner: keine Freigabe · Link zu Freigabe-Einstellungen. */
export function HvFreigabeInfoBanner({ kind, schwelleLabel }: Props) {
  const { title } = freigabeBypassInfoCopy({
    bypassGrund: kind,
    schwelleLabel,
  });

  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3"
      style={{
        borderColor: "#dce5df",
        background: "#f6f9f7",
      }}
    >
      <div className="min-w-0">
        <p className="portal-text-body font-semibold text-text-primary">
          {title}
        </p>
        <p className="portal-text-meta mt-0.5 text-text-secondary">
          Keine Freigabe notwendig
        </p>
      </div>
      <Link
        href={EINSTELLUNGEN_HREF}
        className="portal-text-meta shrink-0 font-semibold underline-offset-2 hover:underline"
        style={{ color: PORTAL_VAR.primary }}
        onClick={() => {
          try {
            sessionStorage.setItem(einstellungenNavStorageKey("hv"), "freigabe");
          } catch {
            /* ignore */
          }
        }}
      >
        Einstellungen
      </Link>
    </div>
  );
}
