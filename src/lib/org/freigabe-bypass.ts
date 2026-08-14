import type { FreigabeBypassGrund } from "@/lib/org/types";

/** CRM setzt `leads.freigabe_bypass_grund` — Portal zeigt nur Info, rechnet nicht selbst. */
export function parseFreigabeBypassGrund(
  raw: unknown
): FreigabeBypassGrund | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "schwelle" || s === "akut") return s;
  return null;
}

/** Info-Banner / Copy: Auto-Pfad ohne HV-Freigabe-Schritt. */
export function isFreigabeBypassInfo(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: FreigabeBypassGrund | null;
}): boolean {
  const st = String(opts.orgFreigabeStatus ?? "").trim().toLowerCase();
  return st === "nicht_noetig" && Boolean(opts.bypassGrund);
}

export function freigabeBypassInfoCopy(opts: {
  bypassGrund: FreigabeBypassGrund;
  schwelleLabel?: string | null;
}): { title: string; body: string } {
  if (opts.bypassGrund === "akut") {
    return {
      title: "Auftrag läuft (Akut)",
      body: "",
    };
  }
  const schwelle = opts.schwelleLabel?.trim();
  return {
    title: schwelle
      ? `Auftrag läuft (unter ${schwelle})`
      : "Auftrag läuft (unter Schwelle)",
    body: "",
  };
}
