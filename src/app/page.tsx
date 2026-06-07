import type { Metadata } from "next";

import BaerenwaldLandingClient from "./baerenwald-landing-client";
import { OG_IMAGE } from "@/lib/config";
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
      title: { absolute: title },
      description,
      images: [OG_IMAGE.url],
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
