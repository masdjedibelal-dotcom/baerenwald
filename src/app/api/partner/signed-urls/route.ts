import { NextResponse } from "next/server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import { createPartnerSignedUrlCache } from "@/lib/partner/partner-signed-url-cache";

export const runtime = "nodejs";

/** On-demand Signed URLs für Partner-Detail (Listen-SSR spart Storage-Calls). */
export async function POST(req: Request) {
  const session = await requireAccountSession();
  if (!session.ok || session.kind !== "handwerker") {
    return NextResponse.json(
      { error: session.ok ? "Kein Partner-Konto." : session.error },
      { status: session.ok ? 403 : session.status }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 });
  }

  const paths = Array.isArray((body as { paths?: unknown }).paths)
    ? ((body as { paths: unknown[] }).paths)
        .map((p) => String(p ?? "").trim())
        .filter(Boolean)
        .slice(0, 80)
    : [];

  if (!paths.length) {
    return NextResponse.json({ ok: true, urls: {} as Record<string, string> });
  }

  const cache = createPartnerSignedUrlCache();
  const entries = await Promise.all(
    paths.map(async (p) => {
      const url = await cache.resolve(p);
      return [p, url] as const;
    })
  );
  const urls: Record<string, string> = {};
  for (const [p, url] of entries) {
    if (url) urls[p] = url;
  }

  return NextResponse.json({ ok: true, urls });
}
