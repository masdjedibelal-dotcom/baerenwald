import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aushang PDF",
  robots: { index: false, follow: false },
};

export default function AushangPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
