"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import "@/app/baerenwald-landing.css";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import {
  LEISTUNGEN,
  RATGEBER,
  leistungHref,
  ratgeberHref,
} from "@/lib/routes";

type DropdownId = "leistungen" | "ratgeber" | "information";

function Chevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function headerLeistungenActive(pathname: string) {
  return pathname.startsWith("/leistungen");
}

function headerRatgeberActive(pathname: string) {
  return pathname.startsWith("/ratgeber");
}

function headerInformationActive(pathname: string) {
  return (
    pathname.startsWith("/ueber-uns") || pathname.startsWith("/kontakt")
  );
}

export interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);

  const closeAll = useCallback(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!openDropdown) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = headerRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDropdown]);

  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const root = document.querySelector(".baerenwald-landing");
      if (!root) return;
      const els = root.querySelectorAll(".fade-up");

      const markIfInView = (el: Element) => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 0;
        if (r.top < vh && r.bottom > 0) {
          el.classList.add("visible");
        }
      };

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add("visible");
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
      );

      els.forEach((el) => {
        markIfInView(el);
        io?.observe(el);
      });

      requestAnimationFrame(() => {
        els.forEach((el) => markIfInView(el));
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      io?.disconnect();
    };
  }, [pathname]);

  const toggleDropdown = (id: DropdownId) => {
    setOpenDropdown((d) => (d === id ? null : id));
  };

  return (
    <div className="site-root">
      <header
        ref={headerRef}
        className={`site-header${scrolled ? " site-header--scrolled" : ""}`}
      >
        <div className="site-header-inner">
          <Link href="/" className="site-header-logo" onClick={closeAll}>
            <div className="site-header-logo-mark">🐻</div>
            <span className="site-header-logo-name">Bärenwald</span>
          </Link>

          <nav className="site-header-nav" aria-label="Hauptnavigation">
            <Link href="/#how" onClick={closeAll}>
              Wie es funktioniert
            </Link>
            <div
              className={`site-header-dropdown-wrap${openDropdown === "leistungen" ? " is-open" : ""}`}
            >
              <button
                type="button"
                className={`site-header-nav-trigger${headerLeistungenActive(pathname) ? " active" : ""}`}
                aria-expanded={openDropdown === "leistungen"}
                aria-haspopup="true"
                onClick={() => toggleDropdown("leistungen")}
              >
                Leistungen
                <Chevron />
              </button>
              {openDropdown === "leistungen" ? (
                <div className="site-header-dropdown" role="menu">
                  {LEISTUNGEN.map((l) => (
                    <Link
                      key={l.slug}
                      href={leistungHref(l.slug)}
                      role="menuitem"
                      onClick={() => setOpenDropdown(null)}
                    >
                      <span style={{ marginRight: "0.45em" }} aria-hidden>
                        {l.icon}
                      </span>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`site-header-dropdown-wrap${openDropdown === "ratgeber" ? " is-open" : ""}`}
            >
              <button
                type="button"
                className={`site-header-nav-trigger${headerRatgeberActive(pathname) ? " active" : ""}`}
                aria-expanded={openDropdown === "ratgeber"}
                aria-haspopup="true"
                onClick={() => toggleDropdown("ratgeber")}
              >
                Ratgeber
                <Chevron />
              </button>
              {openDropdown === "ratgeber" ? (
                <div className="site-header-dropdown" role="menu">
                  <p className="site-header-dropdown-label">Was kostet …</p>
                  {RATGEBER.map((r) => (
                    <Link
                      key={r.slug}
                      href={ratgeberHref(r.slug)}
                      role="menuitem"
                      onClick={() => setOpenDropdown(null)}
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <Link href="/#faq" onClick={closeAll}>
              FAQ
            </Link>

            <div
              className={`site-header-dropdown-wrap site-header-dropdown-wrap--end${openDropdown === "information" ? " is-open" : ""}`}
            >
              <button
                type="button"
                className={`site-header-nav-trigger${headerInformationActive(pathname) ? " active" : ""}`}
                aria-expanded={openDropdown === "information"}
                aria-haspopup="true"
                onClick={() => toggleDropdown("information")}
              >
                Information
                <Chevron />
              </button>
              {openDropdown === "information" ? (
                <div className="site-header-dropdown" role="menu">
                  <Link
                    href="/ueber-uns"
                    role="menuitem"
                    onClick={() => setOpenDropdown(null)}
                  >
                    Über uns
                  </Link>
                  <Link
                    href="/#faq"
                    role="menuitem"
                    onClick={() => setOpenDropdown(null)}
                  >
                    Kontakt
                  </Link>
                </div>
              ) : null}
            </div>

            <Link href="/rechner" className="site-header-cta" onClick={closeAll}>
              Angebot anfordern
            </Link>
          </nav>

          <button
            type="button"
            className="site-header-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Menü öffnen"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M3 6h16M3 11h16M3 16h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="site-mobile-menu" role="dialog" aria-modal="true">
          <div className="site-mobile-menu-head">
            <Link href="/" className="site-header-logo" onClick={closeAll}>
              <div className="site-header-logo-mark">🐻</div>
              <span className="site-header-logo-name">Bärenwald</span>
            </Link>
            <button
              type="button"
              className="site-mobile-close"
              onClick={() => setMobileOpen(false)}
              aria-label="Menü schließen"
            >
              ✕
            </button>
          </div>

          <nav className="site-mobile-links" aria-label="Hauptnavigation">
            <Link href="/#how" onClick={closeAll}>
              Wie es funktioniert
            </Link>
            <Link href="/#leistungen" onClick={closeAll}>
              Leistungen auf der Startseite
            </Link>
            <Link href="/#faq" onClick={closeAll}>
              FAQ
            </Link>
            <Link href="/#faq" onClick={closeAll}>
              Kontakt
            </Link>
            <Link href="/ratgeber" onClick={closeAll}>
              Ratgeber-Übersicht
            </Link>
          </nav>

          <div className="site-mobile-section">
            <p className="site-mobile-section-title">Leistungen</p>
            {LEISTUNGEN.map((l) => (
              <Link
                key={l.slug}
                href={leistungHref(l.slug)}
                onClick={closeAll}
              >
                {l.icon} {l.label}
              </Link>
            ))}
          </div>

          <div className="site-mobile-section">
            <p className="site-mobile-section-title">Ratgeber — Was kostet …</p>
            {RATGEBER.map((r) => (
              <Link key={r.slug} href={ratgeberHref(r.slug)} onClick={closeAll}>
                {r.label}
              </Link>
            ))}
          </div>

          <div className="site-mobile-section">
            <p className="site-mobile-section-title">Information</p>
            <Link href="/ueber-uns" onClick={closeAll}>
              Über uns
            </Link>
            <Link href="/kontakt" onClick={closeAll}>
              Kontakt
            </Link>
          </div>

          <Link href="/rechner" className="site-mobile-cta" onClick={closeAll}>
            Angebot anfordern →
          </Link>
        </div>
      ) : null}

      <main className="site-main">{children}</main>

      <MarketingFooter />
    </div>
  );
}
