"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  LEISTUNGEN,
  RATGEBER,
  leistungHref,
  ratgeberHref,
} from "@/lib/routes";
import { cn } from "@/lib/utils";

type DropdownId = "leistungen" | "ratgeber";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, []);

  useEffect(() => {
    if (!openDropdown && !mobileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = headerRef.current;
      if (!el || el.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDropdown, mobileOpen, closeAll]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const toggleDropdown = (id: DropdownId) => {
    setOpenDropdown((d) => (d === id ? null : id));
  };

  const navLinkClass =
    "text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary";

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-border-light bg-surface-card/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="group flex min-w-0 flex-col gap-0.5" onClick={closeAll}>
          <span className="font-sans text-[20px] font-extrabold leading-none tracking-tight text-accent">
            Bärenwald
          </span>
        </Link>

        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Hauptnavigation"
        >
          <div className="relative">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 py-2",
                navLinkClass,
                openDropdown === "leistungen" && "text-text-primary"
              )}
              aria-expanded={openDropdown === "leistungen"}
              aria-haspopup="true"
              onClick={() => toggleDropdown("leistungen")}
            >
              Leistungen
              <ChevronDown
                className={cn(
                  "transition-transform",
                  openDropdown === "leistungen" && "rotate-180"
                )}
              />
            </button>
            {openDropdown === "leistungen" ? (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-3rem,22rem)] rounded-xl border border-border-default bg-surface-card py-2 shadow-lg"
                role="menu"
              >
                <ul className="max-h-[min(70vh,24rem)] overflow-y-auto px-2 py-1">
                  {LEISTUNGEN.map((l) => (
                    <li key={l.slug}>
                      <Link
                        href={leistungHref(l.slug)}
                        className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
                        onClick={closeAll}
                      >
                        <span className="mr-1.5" aria-hidden>
                          {l.icon}
                        </span>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 py-2",
                navLinkClass,
                openDropdown === "ratgeber" && "text-text-primary"
              )}
              aria-expanded={openDropdown === "ratgeber"}
              aria-haspopup="true"
              onClick={() => toggleDropdown("ratgeber")}
            >
              Ratgeber
              <ChevronDown
                className={cn(
                  "transition-transform",
                  openDropdown === "ratgeber" && "rotate-180"
                )}
              />
            </button>
            {openDropdown === "ratgeber" ? (
              <div className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-3rem,24rem)] rounded-xl border border-border-default bg-surface-card py-2 shadow-lg">
                <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  Was kostet …
                </p>
                <ul className="max-h-[40vh] overflow-y-auto px-2 py-1">
                  {RATGEBER.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={ratgeberHref(r.slug)}
                        className="block rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-muted hover:text-text-primary"
                        onClick={closeAll}
                      >
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <Link href="/ueber-uns" className={navLinkClass} onClick={closeAll}>
            Über uns
          </Link>
          <Link href="/kontakt" className={navLinkClass} onClick={closeAll}>
            Kontakt
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/rechner"
            className={cn(
              "btn-pill-primary hidden py-2.5 px-5 text-[13px] lg:inline-flex"
            )}
            onClick={closeAll}
          >
            Angebot anfordern
          </Link>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border-default text-text-primary lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">Menü</span>
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" id="site-mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-[#1A3D2B]/55"
            aria-label="Menü schließen"
            onClick={closeAll}
          />
          <div
            className={cn(
              "absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-surface-card shadow-xl transition-transform duration-200 ease-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex h-[68px] items-center justify-between border-b border-border-default px-4">
              <span className="font-sans text-lg font-extrabold text-accent">
                Menü
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default"
                onClick={closeAll}
                aria-label="Schließen"
              >
                <CloseIcon />
              </button>
            </div>
            <nav
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4"
              aria-label="Mobile Navigation"
            >
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Leistungen
              </p>
              {LEISTUNGEN.map((l) => (
                <Link
                  key={l.slug}
                  href={leistungHref(l.slug)}
                  className="rounded-lg py-2 text-sm text-text-secondary hover:bg-muted hover:text-text-primary"
                  onClick={closeAll}
                >
                  {l.label}
                </Link>
              ))}
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Ratgeber
              </p>
              {RATGEBER.map((r) => (
                <Link
                  key={r.slug}
                  href={ratgeberHref(r.slug)}
                  className="rounded-lg py-2 text-sm text-text-secondary hover:bg-muted hover:text-text-primary"
                  onClick={closeAll}
                >
                  {r.label}
                </Link>
              ))}
              <Link
                href="/ueber-uns"
                className="mt-4 rounded-lg py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                onClick={closeAll}
              >
                Über uns
              </Link>
              <Link
                href="/kontakt"
                className="rounded-lg py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                onClick={closeAll}
              >
                Kontakt
              </Link>
              <Link
                href="/rechner"
                className="btn-pill-primary mt-4 inline-flex justify-center py-2.5 px-5 text-[13px]"
                onClick={closeAll}
              >
                Angebot anfordern
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
