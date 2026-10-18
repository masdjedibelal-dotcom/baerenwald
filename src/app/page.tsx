import type { Metadata } from "next";

import BaerenwaldLandingClient from "./baerenwald-landing-client";
import { OG_IMAGE } from "@/lib/config";
import { TEO_FAQ, TeoStartseite } from "@/components/teo/TeoStartseite";
import { LeistungenCarousel } from "@/components/ui/LeistungenCarousel";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { HOME_FAQ_ITEMS } from "@/lib/home-content";
import { istTeo, MARKE } from "@/lib/marke";
import { faqSchema } from "@/lib/schema";
import { isStagingDeploy } from "@/lib/staging";

import "@/app/baerenwald-landing.css";

const title =
  "Bärenwald München — Maler, Elektriker, Bodenleger — alles aus einer Hand";

const description =
  "Partner München — ein Ansprechpartner für alle Gewerke. Preisrahmen online berechnen. Malerarbeiten, Bad, Elektro, Heizung. Unverbindlich.";

const teoTitle = `${MARKE.nameLang} — Instandhaltung für Hausverwaltungen in München`;
const teoDescription =
  "teo übernimmt den technischen Ablauf Ihrer Objekte — von der Schadenmeldung bis zur Abnahme. Ein Ansprechpartner für alle Gewerke, jeder Stand im Portal.";

export async function generateMetadata(): Promise<Metadata> {
  if (istTeo) {
    return {
      title: { absolute: teoTitle },
      description: teoDescription,
      robots: isStagingDeploy() ? { index: false, follow: false } : { index: true, follow: true },
      openGraph: { title: { absolute: teoTitle }, description: teoDescription, type: "website" },
    };
  }
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
  if (istTeo) {
    const teoFaqJson = JSON.stringify(faqSchema(TEO_FAQ.map((f) => ({ q: f.frage, a: f.antwort }))));
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: teoFaqJson }} />
        <TeoStartseite />
      </>
    );
  }
  const faqJson = JSON.stringify(faqSchema(HOME_FAQ_ITEMS));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJson }}
      />
      <BaerenwaldLandingClient leistungenSection={<LeistungenCarousel />} />
      <WhatsAppFloat />
    </>
  );
}
