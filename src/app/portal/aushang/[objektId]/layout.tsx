import type { Metadata } from "next";

import {
  AUSHANG_PRINT_META_CONTENT,
  AUSHANG_PRINT_META_NAME,
} from "@/lib/portal2/aushang";

/**
 * E3 — eigene Print-Ansicht; Mock-Meta `omelette-owns-print: aushang`.
 */
export const metadata: Metadata = {
  title: "Aushang drucken",
  robots: { index: false, follow: false },
  other: {
    [AUSHANG_PRINT_META_NAME]: AUSHANG_PRINT_META_CONTENT,
  },
};

export default function AushangPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="portal-aushang-print-page">{children}</div>;
}
