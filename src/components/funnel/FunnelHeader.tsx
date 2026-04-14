"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface FunnelHeaderProps {
  className?: string;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FunnelHeader({ className }: FunnelHeaderProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const [exitOpen, setExitOpen] = useState(false);

  const initials = SITE_CONFIG.logoInitials.slice(0, 2).toUpperCase();
  const tel = SITE_CONFIG.phone.replace(/\s/g, "");

  const closeExit = useCallback(() => setExitOpen(false), []);
  const confirmExit = useCallback(() => {
    setExitOpen(false);
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (!exitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExit();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [exitOpen, closeExit]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 flex h-[60px] items-center justify-between gap-3 border-b border-border-default bg-surface-card/90 px-4 backdrop-blur-sm sm:px-6",
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-funnel-accent text-xs font-semibold text-white"
            aria-hidden
          >
            {initials}
          </div>
          <span className="truncate font-semibold text-text-primary">
            {SITE_CONFIG.companyName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="rounded-full border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-text-tertiary hover:text-text-primary sm:px-4 sm:text-sm"
          >
            Abbrechen
          </button>
          <a
            href={`tel:${tel}`}
            className="flex shrink-0 items-center gap-1.5 text-sm text-text-tertiary"
          >
            <PhoneIcon className="shrink-0 text-text-tertiary" />
            <span className="hidden sm:inline">{SITE_CONFIG.phone}</span>
          </a>
        </div>
      </header>

      {exitOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeExit();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescId}
            className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={dialogTitleId}
              className="font-display text-lg font-semibold text-text-primary"
            >
              Preisrechner abbrechen?
            </h2>
            <p
              id={dialogDescId}
              className="mt-2 text-sm leading-relaxed text-text-secondary"
            >
              Wenn du jetzt gehst, sind deine Eingaben in diesem Durchlauf
              weg. Möchtest du wirklich zur Startseite zurück?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeExit}
                className="rounded-full border border-border-default px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-secondary"
              >
                Nein, weiter
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="rounded-full bg-funnel-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Ja, zur Startseite
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
