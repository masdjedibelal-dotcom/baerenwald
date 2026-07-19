"use client";

import Link from "next/link";

import { PortalAushangPoster } from "@/components/shared/PortalAushangPoster";
import {
  AUSHANG_PRINT_LABEL,
  type AushangBrand,
  type AushangObjektView,
} from "@/lib/portal2/aushang";

type Props = {
  brand: AushangBrand;
  objekt: AushangObjektView;
  meldeUrl: string;
};

/**
 * E3 Print-Client — Poster @793px + Drucken; Host `#aushang-print`.
 */
export function PortalAushangPrintClient({ brand, objekt, meldeUrl }: Props) {
  return (
    <main className="portal-aushang-print-main">
      <div className="portal-aushang-print-toolbar no-print">
        <Link href="/portal" className="text-sm font-semibold text-accent">
          ‹ Portal
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="portal-aushang-btn-print"
            onClick={() => window.print()}
          >
            {AUSHANG_PRINT_LABEL}
          </button>
        </div>
      </div>
      <div className="portal-aushang-print-stage">
        <PortalAushangPoster
          id="aushang-print"
          brand={brand}
          objekt={objekt}
          meldeUrl={meldeUrl}
          width={793}
          isPrint
        />
      </div>
    </main>
  );
}
