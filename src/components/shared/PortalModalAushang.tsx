"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PortalAushangPoster } from "@/components/shared/PortalAushangPoster";
import {
  AUSHANG_MODAL_SUB,
  AUSHANG_MODAL_TITLE,
  AUSHANG_PRINT_LABEL,
  AUSHANG_PRINT_META_CONTENT,
  AUSHANG_PRINT_META_NAME,
  aushangPrintPath,
  aushangUrl,
  type AushangBrand,
  type AushangObjektView,
} from "@/lib/portal2/aushang";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

export type PortalModalAushangProps = {
  open?: boolean;
  onClose: () => void;
  brand: AushangBrand;
  objekt: AushangObjektView;
  orgKennung: string;
};

/**
 * Mock `modalAushang` / `openAushang(o)` — Preview + Drucken + PDF.
 * Print: Host `#aushang-print` + Meta omelette-owns-print; eigene Ansicht `/portal/aushang/[id]`.
 */
export function PortalModalAushang({
  open = true,
  onClose,
  brand,
  objekt,
  orgKennung,
}: PortalModalAushangProps) {
  const [previewW, setPreviewW] = useState(430);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    function sync() {
      setPreviewW(window.matchMedia("(min-width: 1024px)").matches ? 430 : 300);
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  /** Mock-Meta `omelette-owns-print: aushang` während Modal offen. */
  useEffect(() => {
    if (!open) return;
    let meta = document.querySelector(
      `meta[name="${AUSHANG_PRINT_META_NAME}"]`
    ) as HTMLMetaElement | null;
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", AUSHANG_PRINT_META_NAME);
      document.head.appendChild(meta);
      created = true;
    }
    const prev = meta.getAttribute("content");
    meta.setAttribute("content", AUSHANG_PRINT_META_CONTENT);
    return () => {
      if (created && meta) meta.remove();
      else if (meta && prev != null) meta.setAttribute("content", prev);
      else if (meta && prev == null) meta.removeAttribute("content");
    };
  }, [open]);

  const meldeUrl = useMemo(
    () =>
      aushangUrl(orgKennung, {
        melde_slug: objekt.melde_slug,
        name: objekt.titel,
      }),
    [orgKennung, objekt.melde_slug, objekt.titel]
  );

  function printAushang() {
    window.print();
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const res = await fetch(
        `/api/org/melde-aushang?objektId=${encodeURIComponent(objekt.id)}`
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        portalToastError(json.error ?? "PDF fehlgeschlagen");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `Aushang-${objekt.melde_slug || objekt.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
      orgPortalToast.aushangPdfErstellt();
    } finally {
      setPdfBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="portal-aushang-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="portal-aushang-modal-panel"
        style={{ maxWidth: previewW + 40 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-aushang-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="portal-aushang-modal-header">
          <div>
            <h2 id="portal-aushang-title" className="portal-aushang-modal-title">
              {AUSHANG_MODAL_TITLE}
            </h2>
            <p className="portal-aushang-modal-sub">{AUSHANG_MODAL_SUB}</p>
          </div>
          <button
            type="button"
            className="portal-aushang-modal-close"
            aria-label="Schließen"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="portal-aushang-modal-stage">
          <div className="portal-aushang-modal-shadow">
            <PortalAushangPoster
              brand={brand}
              objekt={objekt}
              meldeUrl={meldeUrl}
              width={previewW}
              isPrint={false}
            />
          </div>
        </div>

        <div className="portal-aushang-print-host" aria-hidden>
          <PortalAushangPoster
            id="aushang-print"
            brand={brand}
            objekt={objekt}
            meldeUrl={meldeUrl}
            width={793}
            isPrint
          />
        </div>

        <div className="portal-aushang-modal-actions">
          <button
            type="button"
            className="portal-aushang-btn-print"
            onClick={printAushang}
          >
            {AUSHANG_PRINT_LABEL}
          </button>
          <Link
            href={aushangPrintPath(objekt.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-aushang-btn-pdf"
          >
            Print-Ansicht
          </Link>
          <button
            type="button"
            className="portal-aushang-btn-pdf"
            disabled={pdfBusy}
            onClick={() => void downloadPdf()}
          >
            {pdfBusy ? "PDF…" : "PDF"}
          </button>
          <button
            type="button"
            className="portal-aushang-btn-close"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export function toAushangObjektView(o: {
  id: string;
  titel: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  melde_slug?: string | null;
}): AushangObjektView {
  const adresse = [o.strasse, o.hausnummer, o.plz, o.ort]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: o.id,
    titel: o.titel,
    adresse: adresse || o.titel,
    melde_slug: o.melde_slug,
  };
}

export function brandFromOrgKunde(kunde: {
  org_anzeigename?: string | null;
  name?: string | null;
  org_sub?: string | null;
  org_logo_kuerzel?: string | null;
  org_primary_color?: string | null;
  org_primary_color_dk?: string | null;
  org_primary_color_soft?: string | null;
  org_telefon?: string | null;
  email?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
}): AushangBrand {
  return {
    name:
      kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung",
    sub: kunde.org_sub,
    logoKuerzel: kunde.org_logo_kuerzel,
    primary: kunde.org_primary_color?.trim() || "#2E7D52",
    primaryDk: kunde.org_primary_color_dk,
    soft: kunde.org_primary_color_soft,
    telefon:
      kunde.mieter_kontakt_telefon?.trim() ||
      kunde.org_telefon?.trim() ||
      null,
    email: kunde.mieter_kontakt_email?.trim() || kunde.email?.trim() || null,
  };
}
