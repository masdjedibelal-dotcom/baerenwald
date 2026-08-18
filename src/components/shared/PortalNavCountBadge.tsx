/** Kleine Zähler-Badge oben rechts am Nav-Icon (nur wenn count &gt; 0). */
export function PortalNavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="pointer-events-none absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-surface-card"
      aria-hidden
    >
      {label}
    </span>
  );
}

export type PortalNavBadgeCounts = {
  offen?: number;
  freigabe?: number;
  vorgaenge?: number;
  anfragen: number;
  angebote: number;
  auftraege: number;
};

export function portalNavBadgeCount(
  id: string,
  counts: PortalNavBadgeCounts
): number {
  if (id === "offen" || id === "freigabe") {
    return counts.freigabe ?? counts.offen ?? 0;
  }
  if (id === "vorgaenge") {
    return counts.vorgaenge ?? 0;
  }
  if (id === "anfragen") return counts.anfragen;
  if (id === "angebote") return counts.angebote;
  if (id === "auftraege") return counts.auftraege;
  return 0;
}
