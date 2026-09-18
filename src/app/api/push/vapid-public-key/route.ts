import { NextResponse } from "next/server";

import { getVapidPublicKey, isPushServerConfigured } from "@/lib/push/vapid";

export async function GET() {
  if (!isPushServerConfigured()) {
    return NextResponse.json(
      { error: "Push ist serverseitig nicht konfiguriert." },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}
