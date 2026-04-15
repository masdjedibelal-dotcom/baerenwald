import type { Metadata } from "next";

import BaerenwaldLandingClient from "./baerenwald-landing-client";
import { LeistungenCarousel } from "@/components/ui/LeistungenCarousel";
import { CTA } from "@/lib/cta-config";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { faqSchema } from "@/lib/schema";

import "@/app/baerenwald-landing.css";

const title =
  "Bärenwald München — Maler, Elektriker, Bodenleger — alles aus einer Hand";

const description =
  `Kostenloser Preisrechner für Handwerksleistungen in München. Malerarbeiten, Bad, Elektro, Garten und mehr. Ein Ansprechpartner, wir kümmern uns um alle Handwerker — unverbindliche Beratung, Anfahrt wird bei Beauftragung angerechnet. ${CTA.heroSub}.`;

const keywords = [
  "Handwerker München",
  "Renovierung München",
  "Malerarbeiten München",
  "Badsanierung München",
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: title },
    description,
    keywords,
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
    </>
  );
}
