"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  orgName: string;
  statusToken?: string | null;
  statusLink?: string | null;
};

export function MeldenBestaetigungClient({
  orgName,
  statusToken,
  statusLink,
}: Props) {
  const [copied, setCopied] = useState(false);

  const href = useMemo(() => {
    if (statusLink?.trim()) return statusLink.trim();
    if (statusToken?.trim()) return `/melden/status/${statusToken.trim()}`;
    return null;
  }, [statusLink, statusToken]);

  const absoluteUrl = useMemo(() => {
    if (!href) return null;
    if (href.startsWith("http")) return href;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;
    }
    return href;
  }, [href]);

  async function copyLink() {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-[#f7f4ef]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-light p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-text-primary">
          Danke — Meldung ist bei uns
        </h1>
        <p className="text-text-secondary mt-2 text-sm">
          {orgName} hat Ihre Meldung erhalten. Speichern Sie den Link unten — er
          ist Ihr Zugang zum Stand Ihrer Meldung.
        </p>

        {href ? (
          <div className="mt-5 rounded-xl border border-[#d9e3dd] bg-[#f7f4ef] p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Ihr Status-Link
            </p>
            <p className="mt-2 break-all text-sm font-mono text-text-primary">
              {absoluteUrl ?? href}
            </p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-pill-primary mt-3 w-full text-center"
            >
              {copied ? "Kopiert" : "Link kopieren"}
            </button>
            <p className="mt-2 text-xs text-text-tertiary">
              Bitte speichern oder als Lesezeichen ablegen — ohne diesen Link
              können Sie den Fortschritt nicht erneut aufrufen.
            </p>
            {href.startsWith("/") ? (
              <Link
                href={href}
                className="mt-2 block text-center text-sm text-accent underline"
              >
                Status jetzt ansehen
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="text-text-tertiary mt-4 text-xs">
            Ihre Hausverwaltung meldet sich zum nächsten Schritt.
          </p>
        )}

        <div className="mt-5">
          <Link href="/" className="btn-pill-outline text-center block">
            Schließen
          </Link>
        </div>
      </div>
    </div>
  );
}
