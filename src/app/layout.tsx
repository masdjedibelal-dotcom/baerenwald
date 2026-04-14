import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { JsonLdOrganization } from "@/components/JsonLdOrganization";
import { SITE_CONFIG } from "@/lib/config";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const metadataBase = new URL(SITE_CONFIG.url);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Bärenwald Handwerksgruppe München",
    template: "%s | Bärenwald Handwerksgruppe",
  },
  description:
    "Ein Ansprechpartner für Handwerksleistungen in München & Umgebung — Maler, Bad, Elektro, Garten, Winterdienst und mehr. Kostenloser Preisrechner.",
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.companyName,
    title: "Bärenwald Handwerksgruppe München",
    description:
      "Handwerkskoordination und Leistungen in München & Umgebung — transparent, meisterlich, aus einer Hand.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bärenwald Handwerksgruppe München",
    description:
      "Ein Ansprechpartner. Wir kümmern uns um alle Handwerker. Jetzt Preisrechner starten.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.accentColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${plusJakarta.variable} ${lora.variable}`}
      style={
        {
          "--acc": SITE_CONFIG.accentColor,
          "--accent": SITE_CONFIG.accentColor,
          "--ring": SITE_CONFIG.accentColor,
        } as CSSProperties
      }
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <JsonLdOrganization />
        {children}
      </body>
    </html>
  );
}
