"use client";

import { PortalFunnelHost } from "@/components/funnel/PortalFunnelHost";
import type { PortalFunnelObjekt } from "@/components/funnel/PortalFunnelHost";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";

type Props = {
  open: boolean;
  channel: Extract<
    FunnelChannel,
    "portal_privat" | "portal_eigentuemer" | "portal_mieter"
  >;
  title: string;
  objekte?: PortalFunnelObjekt[];
  prefill?: {
    name?: string;
    email?: string;
    telefon?: string;
    objektId?: string;
    plz?: string;
    ort?: string;
    strasse?: string;
    hausnummer?: string;
  };
  onClose: () => void;
  onDone: () => void;
};

/** Create-Modal für Privat / Eigentümer / Mieter — gemeinsamer Funnel-Core. */
export function PortalCreateFunnelModal({
  open,
  channel,
  title,
  objekte = [],
  prefill,
  onClose,
  onDone,
}: Props) {
  if (!open) return null;

  return (
    <PortalModalShell
      open={open}
      title={title}
      onClose={onClose}
      size="funnel"
      maxWidth={1360}
    >
      <PortalFunnelHost
        channel={channel}
        title={title}
        layout="modal"
        objekte={objekte}
        prefill={prefill}
        onClose={onClose}
        onDone={onDone}
      />
    </PortalModalShell>
  );
}
