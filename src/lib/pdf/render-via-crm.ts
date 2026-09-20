/**
 * Portal → CRM PDF-Service (O5). Kein Chromium / pdf-lib im Portal-Runtime.
 */

const PDF_UI_ERROR =
  "PDF konnte nicht erzeugt werden. Bitte erneut versuchen.";

function resolveCrmBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Encode Uint8Array fields for JSON transport:
 * `fooBytes` / `logoBytes` / `qrPngBytes` → `fooBase64` / `logoBase64` / `qrPngBase64`.
 */
export function encodePdfDataForCrm(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Uint8Array) {
      const baseKey = key.endsWith("Bytes") ? key.slice(0, -"Bytes".length) : key;
      out[`${baseKey}Base64`] = bytesToBase64(value);
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Nested plain objects (e.g. absender) — shallow scan for bytes
      const nested = value as Record<string, unknown>;
      const hasBytes = Object.values(nested).some((v) => v instanceof Uint8Array);
      if (hasBytes) {
        out[key] = encodePdfDataForCrm(nested);
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

export async function renderPdfViaCrm(
  template: string,
  data: Record<string, unknown>
): Promise<Uint8Array> {
  const base = resolveCrmBaseUrl();
  const secret = process.env.PDF_SERVICE_SECRET?.trim();
  if (!base || !secret) {
    console.error("[renderPdfViaCrm] CRM_URL oder PDF_SERVICE_SECRET fehlt");
    throw new Error(PDF_UI_ERROR);
  }

  const payload = {
    template,
    data: encodePdfDataForCrm(data),
  };

  let res: Response;
  try {
    res = await fetch(`${base}/api/pdf/render`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/pdf",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[renderPdfViaCrm] Netzwerkfehler", template, e);
    throw new Error(PDF_UI_ERROR);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error ? ` (${j.error})` : "";
    } catch {
      /* ignore */
    }
    console.error("[renderPdfViaCrm] HTTP", res.status, template, detail);
    throw new Error(PDF_UI_ERROR);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 5) {
    console.error("[renderPdfViaCrm] leere Antwort", template);
    throw new Error(PDF_UI_ERROR);
  }
  return buf;
}

export { PDF_UI_ERROR };
