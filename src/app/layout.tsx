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

const BASE_URL = "https://baerenwaldmuenchen.de";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Bärenwald München — Handwerker aus einer Hand",
    template: "%s — Bärenwald München",
  },

  description:
    "Handwerker in München — ein Ansprechpartner für alle Gewerke. Malerarbeiten, Bad, Elektro, Garten und mehr. Preisrahmen online berechnen.",

  keywords: [
    "Handwerker München",
    "Renovierung München",
    "Malerarbeiten München",
    "Badezimmer sanieren München",
    "Elektriker München",
    "Gartenpflege München",
    "Hausmeisterservice München",
    "Handwerk München",
  ],

  authors: [{ name: "Beran Cakmak" }],
  creator: "Bärenwald München",
  publisher: "Bärenwald München",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: "website",
    locale: "de_DE",
    url: BASE_URL,
    siteName: "Bärenwald München",
    title: "Bärenwald München — Handwerker aus einer Hand",
    description:
      "Ein Ansprechpartner für alle Handwerksleistungen in München. Preisrahmen online berechnen — unverbindlich.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bärenwald München — Handwerker aus einer Hand",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Bärenwald München — Handwerker aus einer Hand",
    description:
      "Ein Ansprechpartner für alle Handwerksleistungen in München.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon-dreieck.png",
    shortcut: "/favicon-dreieck.png",
    apple: "/favicon-dreieck.png",
  },

  alternates: {
    canonical: BASE_URL,
  },
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
