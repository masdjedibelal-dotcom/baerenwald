import type { Metadata } from "next";
import type { ReactNode } from "react";

import { istTeo, MARKE } from "@/lib/marke";

export const metadata: Metadata = {
  title: `${istTeo ? "Anfrage" : "Preisrechner"} — ${MARKE.nameLang}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RechnerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
