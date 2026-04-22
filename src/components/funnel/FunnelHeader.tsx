"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

import { RefreshIcon18 } from "@/components/funnel/NeueAnfrageResetLink";
import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

export interface FunnelHeaderProps {
  className?: string;
  /** Im Rechner neu starten (leert Eingaben, bleibt auf /rechner). */
  onFunnelReset?: () => void;
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

export function FunnelHeader({
  className,
  onFunnelReset,
}: FunnelHeaderProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const [exitOpen, setExitOpen] = useState(false);

  const closeExit = useCallback(() => setExitOpen(false), []);
  const confirmExit = useCallback(() => {
    setExitOpen(false);
    router.push("/");
  }, [router]);

  const handleRestartInFunnel = useCallback(() => {
    setExitOpen(false);
    onFunnelReset?.();
  }, [onFunnelReset]);

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
          "funnel-header sticky top-0 z-50 grid h-[60px] grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border-default bg-surface-card/90 px-3 backdrop-blur-sm sm:px-6",
          className
        )}
      >
        <div className="flex min-w-0 justify-start">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="rounded-full border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-text-tertiary hover:text-text-primary sm:px-4 sm:text-sm"
          >
            Abbrechen
          </button>
        </div>

        <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-center">
          <Image
            src="/logo.png"
            alt="Bärenwald"
            width={40}
            height={40}
            className="shrink-0"
            style={{ objectFit: "contain" }}
          />
          <span
            className="max-w-[200px] truncate text-sm font-semibold leading-none text-text-primary sm:max-w-none"
            aria-hidden
          >
            {SITE_CONFIG.companyName}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <Link
            href="/"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default",
              "text-text-tertiary transition hover:border-text-tertiary hover:text-text-primary"
            )}
            aria-label="Zur Startseite — von vorn beginnen"
            title="Zur Startseite"
          >
            <RefreshIcon18 className="size-[18px]" />
          </Link>
          <a
            href={SITE_CONFIG.phoneHref}
            className="flex shrink-0 items-center gap-1.5 text-sm text-text-tertiary transition hover:text-text-primary"
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
              Du kannst den Rechner neu starten und von vorn beginnen — oder zur
              Startseite wechseln. Was möchtest du tun?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {onFunnelReset ? (
                <button
                  type="button"
                  onClick={handleRestartInFunnel}
                  className="rounded-full border border-border-default px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-secondary"
                >
                  Abbrechen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeExit}
                  className="rounded-full border border-border-default px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-secondary"
                >
                  Nein, weiter
                </button>
              )}
              <button
                type="button"
                onClick={confirmExit}
                className="rounded-full bg-funnel-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
