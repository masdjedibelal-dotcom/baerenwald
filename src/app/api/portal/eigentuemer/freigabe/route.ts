import { NextResponse } from "next/server";

/**
 * Eigentümer geben nichts mehr über Freigabe-Schwelle frei —
 * Portal ist reine Status-Ansicht.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Kostenfreigabe durch Eigentümer ist deaktiviert. Vorgänge sind nur zur Ansicht.",
    },
    { status: 410 }
  );
}
