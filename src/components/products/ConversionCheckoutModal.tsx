"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import {
  formatProduktPreisRange,
  getProdukt,
  produktPreis,
} from "@/lib/products";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  produktSlug: string;
  leadForm: ReactNode;
  secondaryAction?: ReactNode;
  quelle?: string;
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function ConversionCheckoutModal({
  open,
  onClose,
  produktSlug,
  leadForm,
  secondaryAction,
  quelle = "landing",
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const produkt = getProdukt(produktSlug);
  const preis = useMemo(() => produktPreis(produktSlug), [produktSlug]);
  const preisLabel =
    preis && preis.min > 0 ? formatProduktPreisRange(preis.min, preis.max) : "—";

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (!openedRef.current) {
      openedRef.current = true;
      track.checkoutModalOpen(produktSlug, quelle);
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      const focusable = dialogRef.current ? getFocusable(dialogRef.current) : [];
      focusable[0]?.focus();
    });

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, produktSlug, quelle]);

  if (!open) return null;

  return (
    <div className="conversion-checkout-overlay" role="presentation">
      <button
        type="button"
        className="conversion-checkout-backdrop"
        onClick={onClose}
        aria-label="Schließen"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        className="conversion-checkout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversion-checkout-title"
      >
        <header className="conversion-checkout-header">
          <div>
            <p className="conversion-checkout-eyebrow">Kostenrahmen anfragen</p>
            <h2 id="conversion-checkout-title" className="conversion-checkout-title">
              {produkt?.titel ?? "Dein Paket"}
            </h2>
            {produkt?.kurz ? (
              <p className="conversion-checkout-sub">{produkt.kurz}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="conversion-checkout-close"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </header>

        <div className="conversion-checkout-form">{leadForm}</div>

        <div className="conversion-checkout-summary conversion-checkout-summary--footer">
          <span className="conversion-checkout-summary-label">Dein Preisrahmen</span>
          <span className="conversion-checkout-summary-price">{preisLabel}</span>
          <span className="conversion-checkout-summary-hint">
            unverbindlich · Festpreis nach Besichtigung
          </span>
        </div>

        {secondaryAction ? (
          <div className="conversion-checkout-secondary">{secondaryAction}</div>
        ) : null}
      </div>
    </div>
  );
}
