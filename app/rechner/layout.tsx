import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Preisrechner — Bärenwald München",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RechnerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
