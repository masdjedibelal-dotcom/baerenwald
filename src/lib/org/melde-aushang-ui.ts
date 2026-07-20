"use client";

import { meldeAushangPdfPath } from "@/lib/portal2/aushang";

/** Öffnet den individualisierten Aushang-PDF im Browser (Drucken/Speichern). */
export function openMeldeAushangPdf(objektId?: string) {
  const path = meldeAushangPdfPath(objektId);
  window.open(path, "_blank", "noopener,noreferrer");
}

/** Melde-Link in die Zwischenablage. */
export async function copyMeldeLink(url: string): Promise<boolean> {
  const value = url.trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
