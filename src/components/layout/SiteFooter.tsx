import Link from "next/link";

import { SITE_CONFIG } from "@/lib/config";
import {
  LEISTUNGEN,
  RATGEBER_FOOTER_HIGHLIGHTS,
  leistungHref,
  ratgeberHref,
} from "@/lib/routes";
import { cn } from "@/lib/utils";
import { FooterSocialLinks } from "@/components/layout/FooterSocialLinks";

const year = new Date().getFullYear();

function FooterAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-white/10 md:hidden">
      <summary
        className="flex cursor-pointer list-none items-center justify-between py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 [&::-webkit-details-marker]:hidden"
      >
        {title}
        <span className="text-white/50 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="pb-4 pt-0">{children}</div>
    </details>
  );
}

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">
      {children}
    </p>
  );
}

function BrandBlock() {
  return (
    <>
      <p className="font-sans text-[22px] font-extrabold text-white">Bärenwald</p>
      <FooterSocialLinks />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#1A3D2B] text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
        <div className="grid gap-0 md:grid-cols-4 md:gap-12 lg:gap-12">
          <div>
            <FooterAccordion title="Bärenwald">
              <BrandBlock />
            </FooterAccordion>
            <div className="hidden md:block">
              <BrandBlock />
            </div>
          </div>

          <div>
            <FooterAccordion title="Leistungen">
              <ul className="space-y-0">
                {LEISTUNGEN.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={leistungHref(l.slug)}
                      className="block py-1.5 text-[14px] text-white/55 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterAccordion>
            <div className="hidden md:block">
              <ColHeading>Leistungen</ColHeading>
              <ul className="space-y-0">
                {LEISTUNGEN.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={leistungHref(l.slug)}
                      className="block py-1.5 text-[14px] text-white/55 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <FooterAccordion title="Ratgeber">
              <ul className="space-y-0">
                {RATGEBER_FOOTER_HIGHLIGHTS.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={ratgeberHref(r.slug)}
                      className="block py-1.5 text-[14px] text-white/55 transition-colors hover:text-white"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterAccordion>
            <div className="hidden md:block">
              <ColHeading>Ratgeber</ColHeading>
              <ul className="space-y-0">
                {RATGEBER_FOOTER_HIGHLIGHTS.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={ratgeberHref(r.slug)}
                      className="block py-1.5 text-[14px] text-white/55 transition-colors hover:text-white"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <FooterAccordion title="Kontakt">
              <div className="space-y-2 text-[14px] text-white/55">
                <p>
                  <a href={`tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`} className="hover:text-white">
                    {SITE_CONFIG.phone}
                  </a>
                </p>
                <p>
                  <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-white">
                    {SITE_CONFIG.email}
                  </a>
                </p>
                <p>München &amp; Umgebung</p>
                <Link
                  href="/kontakt"
                  className="mt-4 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/60 hover:text-white"
                >
                  Jetzt Angebot anfordern →
                </Link>
              </div>
            </FooterAccordion>
            <div className="hidden md:block">
              <ColHeading>Kontakt</ColHeading>
              <div className="space-y-2 text-[14px] text-white/55">
                <p>
                  <a href={`tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`} className="hover:text-white">
                    {SITE_CONFIG.phone}
                  </a>
                </p>
                <p>
                  <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-white">
                    {SITE_CONFIG.email}
                  </a>
                </p>
                <p>München &amp; Umgebung</p>
                <Link
                  href="/kontakt"
                  className="mt-4 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/60 hover:text-white"
                >
                  Jetzt Angebot anfordern →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-white/[0.08] pt-6">
        <div
          className={cn(
            "mx-auto flex max-w-[1200px] flex-col gap-3 px-6 pb-6 text-[12px] text-white/25",
            "sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <p>© {year} Bärenwald</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/impressum" className="hover:text-white/50">
              Impressum
            </Link>
            <span aria-hidden>·</span>
            <Link href="/datenschutz" className="hover:text-white/50">
              Datenschutz
            </Link>
            <span aria-hidden>·</span>
            <Link href="/agb" className="hover:text-white/50">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
