import type { Metadata } from "next";

import BaerenwaldLandingClient from "./baerenwald-landing-client";
import { LeistungenCarousel } from "@/components/ui/LeistungenCarousel";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { faqSchema } from "@/lib/schema";

import "@/app/baerenwald-landing.css";

const title =
  "Bärenwald München — Maler, Elektriker, Bodenleger — alles aus einer Hand";

const description =
  "Handwerker München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title: { absolute: title },
      description,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: title },
      description,
      images: ["/og-image.png"],
    },
  };
}

export default function HomePage() {
  const faqJson = JSON.stringify(faqSchema(HOME_FAQ_ITEMS));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJson }}
      />
      <BaerenwaldLandingClient
        leistungenSection={<LeistungenCarousel />}
      />
      <WhatsAppFloat />
    </>
  );
}
