import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MARKE } from "@/lib/marke";

export const metadata: Metadata = {
  title: `Preisrechner — ${MARKE.nameLang}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RechnerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
