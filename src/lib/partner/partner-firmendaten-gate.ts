export type PartnerFirmendatenGateInput = {
  firma?: string | null;
  name?: string | null;
  strasse?: string | null;
  ort?: string | null;
  adresse?: string | null;
  telefon?: string | null;
  steuernummer?: string | null;
  ustid?: string | null;
  iban?: string | null;
  kleinunternehmer?: boolean | null;
};

export type PartnerFirmendatenGateResult = {
  ok: boolean;
  missing: string[];
  /** Für Angebote (ohne IBAN). */
  okAngebot: boolean;
  missingAngebot: string[];
  /** Für Rechnungen (inkl. IBAN, Steuer). */
  okRechnung: boolean;
  missingRechnung: string[];
};

function hasText(v?: string | null): boolean {
  return Boolean(v?.trim());
}

function hasAnschrift(input: PartnerFirmendatenGateInput): boolean {
  if (hasText(input.strasse) && hasText(input.ort)) return true;
  return hasText(input.adresse);
}

function hasSteuer(input: PartnerFirmendatenGateInput): boolean {
  return hasText(input.steuernummer) || hasText(input.ustid);
}

/** Pflichtfelder für Auto-Angebot / Auto-Rechnung aus Firmendaten. */
export function checkPartnerFirmendatenGate(
  input: PartnerFirmendatenGateInput
): PartnerFirmendatenGateResult {
  const missingAngebot: string[] = [];
  if (!hasText(input.firma) && !hasText(input.name)) {
    missingAngebot.push("Firmenname");
  }
  if (!hasAnschrift(input)) missingAngebot.push("Anschrift (Straße + PLZ/Ort)");
  if (!hasText(input.telefon)) missingAngebot.push("Telefon");
  if (!hasSteuer(input)) missingAngebot.push("Steuernummer oder USt-IdNr.");

  const missingRechnung = [...missingAngebot];
  if (!hasText(input.iban)) missingRechnung.push("IBAN");

  const okAngebot = missingAngebot.length === 0;
  const okRechnung = missingRechnung.length === 0;

  return {
    ok: okRechnung,
    missing: missingRechnung,
    okAngebot,
    missingAngebot,
    okRechnung,
    missingRechnung,
  };
}
