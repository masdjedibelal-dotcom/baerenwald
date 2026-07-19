"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BwIcon } from "@/components/ui/BwIcon";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";

const PORTAL_BENEFITS = [
  "Status jederzeit einsehen — ohne Nachfragen",
  "Angebote & Unterlagen digital an einem Ort",
  "Bautagebuch & Fortschritt live verfolgen",
  "Projektberatung direkt im Portal",
] as const;

const PARTNER_BENEFITS = [
  "Qualifizierte Anfragen direkt zugewiesen",
  "Angebot mit Preis & PDF in Minuten einreichen",
  "Aufträge mit Bautagebuch dokumentieren",
  "Planer & Profil — alles in einer Oberfläche",
] as const;

function PortalScreenshot({ variant }: { variant: "portal" | "partner" }) {
  const alt =
    variant === "portal"
      ? "MeinBärenwald — Übersicht im Kundenportal"
      : "Bärenwald Partner — Übersicht im Partner-Portal";

  return (
    <div className="portal-landing-shot">
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet={`/images/landing/${variant}-mobile.png`}
        />
        <Image
          src={`/images/landing/${variant}-desktop.png`}
          alt={alt}
          width={560}
          height={420}
          className="portal-landing-shot-img"
        />
      </picture>
    </div>
  );
}

function PortalCard({
  eyebrow,
  title,
  lead,
  benefits,
  loginHref,
  variant,
  icon,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  benefits: readonly string[];
  loginHref: string;
  variant: "portal" | "partner";
  icon: string;
}) {
  return (
    <article className={`portal-landing-card portal-landing-card--${variant}`}>
      <header className="portal-landing-card-head">
        <span className="portal-landing-card-icon" aria-hidden>
          <BwIcon name={icon} size={28} />
        </span>
        <div>
          <p className="portal-landing-eyebrow">{eyebrow}</p>
          <h3 className="portal-landing-card-title">{title}</h3>
          <p className="portal-landing-card-lead">{lead}</p>
        </div>
      </header>

      <PortalScreenshot variant={variant} />

      <ul className="portal-landing-benefits check-list">
        {benefits.map((b) => (
          <li key={b}>
            <span className="check-list-icon" aria-hidden>
              <Check strokeWidth={3} />
            </span>
            {b}
          </li>
        ))}
      </ul>

      <Link href={loginHref} className="portal-landing-login-btn">
        {variant === "partner" ? "Partner-Login" : "Anmelden"}
      </Link>
      {variant === "partner" ? (
        <Link
          href="/partner/registrieren"
          className="portal-text-meta mt-2 block text-center text-accent underline-offset-2 hover:underline"
        >
          Erstes Mal? Registrieren (nach Anlage bei Bärenwald)
        </Link>
      ) : null}
    </article>
  );
}

export function PortalPartnerLandingSection() {
  return (
    <section
      id="portale"
      className="portal-landing-section fade-up"
      aria-labelledby="portal-landing-heading"
    >
      <div className="portal-landing-inner">
        <header className="portal-landing-header">
          <p className="portal-landing-section-eyebrow">DIGITALE PLATTFORM</p>
          <h2 id="portal-landing-heading" className="portal-landing-h2">
            MeinBärenwald & Partner-Portal
          </h2>
          <p className="portal-landing-lead">
            {PARTNER_AUTH_COPY.landingSectionLead}
          </p>
        </header>

        <div className="portal-landing-grid">
          <PortalCard
            eyebrow="FÜR KUND:INNEN"
            title="MeinBärenwald"
            lead="Dein Projekt von der ersten Anfrage bis zur Abnahme — ein Login, voller Überblick."
            benefits={PORTAL_BENEFITS}
            loginHref="/portal/login"
            variant="portal"
            icon="03-betreuung"
          />
          <PortalCard
            eyebrow="FÜR HANDWERKER"
            title="Partner-Portal"
            lead={PARTNER_AUTH_COPY.landingPartnerLead}
            benefits={PARTNER_BENEFITS}
            loginHref="/partner/login"
            variant="partner"
            icon="18-hausmeister"
          />
        </div>
      </div>
    </section>
  );
}
