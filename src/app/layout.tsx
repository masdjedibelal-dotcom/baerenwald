import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { JsonLdLocalBusiness } from "@/components/JsonLd";
import { PortalToaster } from "@/components/shared/PortalToaster";
import { OG_IMAGE, SITE_CONFIG } from "@/lib/config";
import { PHProvider } from "./providers";

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
    "Handwerker München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.",

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
      "Handwerker München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.",
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Bärenwald München — Handwerker aus einer Hand",
    description:
      "Handwerker München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung.",
    images: [OG_IMAGE.url],
  },

  icons: {
    icon: "/favicon.ico?v=20260428b",
    shortcut: "/favicon.ico?v=20260428b",
    apple: "/favicon.ico?v=20260428b",
  },

  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.accentColor,
  width: "device-width",
  initialScale: 1,
  /** Tastatur verkleinert Layout — Eingabezeile bleibt sichtbar (KI-Chat). */
  interactiveWidget: "resizes-content",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');
requestAnimationFrame(function () {
  document.querySelectorAll('.hero-entry, .hero-copy .fade-up').forEach(function (el) {
    el.classList.add('visible');
  });
});`,
          }}
        />
        <PHProvider>
          <JsonLdLocalBusiness />
          <PortalToaster />
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
