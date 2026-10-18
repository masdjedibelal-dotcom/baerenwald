import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Literata, Lora, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { JsonLdLocalBusiness } from "@/components/JsonLd";
import { PortalToaster } from "@/components/shared/PortalToaster";
import { OG_IMAGE, SITE_CONFIG } from "@/lib/config";
import { istTeo, MARKE, MARKE_ID } from "@/lib/marke";
import { isStagingDeploy, publicSiteOrigin } from "@/lib/staging";
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

/* Servus TEO: Manrope + Literata (nur bei NEXT_PUBLIC_MARKE=teo eingebunden) */
const teoSans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const teoDisplay = Literata({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-display" });
const SCHRIFT_KLASSEN = istTeo
  ? `${teoSans.variable} ${teoDisplay.variable}`
  : `${plusJakarta.variable} ${lora.variable}`;
const ICON_DIR = istTeo ? "/brand/teo" : "/icons";

const BASE_URL = publicSiteOrigin();
const staging = isStagingDeploy();

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: istTeo ? MARKE.nameLang : `${MARKE.nameLang} — Partner aus einer Hand`,
    template: `%s — ${MARKE.nameLang}`,
  },

  description: istTeo
    ? "Instandhaltung für Haus- und WEG-Verwaltungen in München — ein Ansprechpartner für alle Gewerke, jeder Stand im Portal."
    : "Partner München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.",

  authors: [{ name: "Beran Cakmak" }],
  creator: MARKE.nameLang,
  publisher: MARKE.nameLang,

  robots: staging || !MARKE.marketingSeite
    ? {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      }
    : {
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
    siteName: MARKE.nameLang,
    title: `${MARKE.nameLang} — Partner aus einer Hand`,
    description:
      "Partner München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.",
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
    title: `${MARKE.nameLang} — Partner aus einer Hand`,
    description:
      "Partner München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung.",
    images: [OG_IMAGE.url],
  },

  icons: {
    icon: [
      ...(istTeo
        ? [{ url: "/brand/teo/favicon.png", type: "image/png" }]
        : [{ url: "/favicon.ico?v=20260816", sizes: "any" }]),
      { url: `${ICON_DIR}/pwa-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${ICON_DIR}/pwa-512.png`, sizes: "512x512", type: "image/png" },
    ],
    shortcut: istTeo ? "/brand/teo/favicon.png" : "/favicon.ico?v=20260816",
    apple: [
      { url: `${ICON_DIR}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },

  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: istTeo ? MARKE.themeColor : SITE_CONFIG.accentColor,
  width: "device-width",
  initialScale: 1,
  /** Pflicht für env(safe-area-inset-*) — Home-Screen-PWA / Notch. */
  viewportFit: "cover",
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
      data-marke={MARKE_ID}
      className={SCHRIFT_KLASSEN}
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
          {MARKE.marketingSeite ? <JsonLdLocalBusiness /> : null}
          <PortalToaster />
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
