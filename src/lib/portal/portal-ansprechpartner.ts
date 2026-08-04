import { SITE_CONFIG } from "@/lib/config";

export type PortalAnsprechpartner = {
  name: string;
  telefon: string;
  telefonHref: string;
  rolleLabel: string;
  intro: string;
  isFallback: boolean;
};

function telefonToHref(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("tel:")) return trimmed;
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return SITE_CONFIG.phoneHref;
  return digits.startsWith("+") ? `tel:${digits}` : `tel:+49${digits.replace(/^0/, "")}`;
}

function formatTelefonAnzeige(raw: string): string {
  const t = raw.trim();
  if (!t) return SITE_CONFIG.phone.replace(/(\d{3})(\d+)/, "$1 $2");
  if (/[^\d+\s/()-]/.test(t)) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("49")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return t;
}

export function portalAnsprechpartnerFallback(): PortalAnsprechpartner {
  return {
    name: SITE_CONFIG.companyName,
    telefon: formatTelefonAnzeige(SITE_CONFIG.phone),
    telefonHref: SITE_CONFIG.phoneHref,
    rolleLabel: "Bärenwald",
    intro:
      "Bei Fragen zu Ihrem Auftrag sind wir persönlich für Sie da — rufen Sie uns gern an.",
    isFallback: true,
  };
}

export function resolvePortalAnsprechpartner(
  betreuer?: { name?: string | null; telefon?: string | null } | null
): PortalAnsprechpartner {
  const name = betreuer?.name?.trim();
  if (!name) return portalAnsprechpartnerFallback();

  const telefonRaw =
    betreuer?.telefon?.trim() || SITE_CONFIG.phoneMobil || SITE_CONFIG.phone;

  return {
    name,
    telefon: formatTelefonAnzeige(telefonRaw),
    telefonHref: telefonToHref(telefonRaw),
    rolleLabel: "Projektleitung",
    intro:
      "Ich bin Ihr persönlicher Ansprechpartner für dieses Projekt — bei Fragen melden Sie sich gern.",
    isFallback: false,
  };
}
