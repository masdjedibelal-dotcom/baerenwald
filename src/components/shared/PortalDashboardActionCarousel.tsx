"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import {
  dashboardButtonOpensDetail,
  runPortalDashboardInlineAction,
} from "@/lib/portal2/dashboard-actions/run-inline-action";
import { cn } from "@/lib/utils";

type Props = {
  slides: PortalDashboardActionSlide[];
  onOpen: (openId: string, opts?: { focus?: string }) => void;
  onRefresh: () => void | Promise<void>;
  className?: string;
};

const SWIPE_THRESHOLD_PX = 48;

/**
 * Dashboard-Aktions-Karussell — echte Vorgänge mit CTAs wie im Detail.
 * Mobil: seitliche Pfeile + Swipe.
 */
export function PortalDashboardActionCarousel({
  slides,
  onOpen,
  onRefresh,
  className,
}: Props) {
  const [index, setIndex] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { runBusy } = usePortalBusy();
  const swipeStartX = useRef<number | null>(null);
  const swipeActive = useRef(false);

  const count = slides.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const slide = slides[safeIndex];

  useEffect(() => {
    if (index >= count && count > 0) {
      setIndex(count - 1);
    }
  }, [count, index]);

  const goPrev = useCallback(() => {
    setError(null);
    setIndex((i) => (i <= 0 ? count - 1 : i - 1));
  }, [count]);

  const goNext = useCallback(() => {
    setError(null);
    setIndex((i) => (i >= count - 1 ? 0 : i + 1));
  }, [count]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select")) return;
    swipeStartX.current = e.clientX;
    swipeActive.current = true;
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!swipeActive.current || swipeStartX.current == null || count <= 1) {
        swipeStartX.current = null;
        swipeActive.current = false;
        return;
      }
      const delta = e.clientX - swipeStartX.current;
      swipeStartX.current = null;
      swipeActive.current = false;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      if (delta < 0) goNext();
      else goPrev();
    },
    [count, goNext, goPrev]
  );

  const onPointerCancel = useCallback(() => {
    swipeStartX.current = null;
    swipeActive.current = false;
  }, []);

  const handleButton = useCallback(
    async (buttonId: string) => {
      if (!slide) return;
      const btn = slide.buttons.find((b) => b.id === buttonId);
      if (!btn) return;

      if (dashboardButtonOpensDetail(btn)) {
        onOpen(
          slide.openId,
          buttonId === "ablehnen" ? { focus: "ablehnen" } : undefined
        );
        return;
      }

      setBusyId(buttonId);
      setError(null);
      try {
        await runBusy(async () => {
          const res = await runPortalDashboardInlineAction({ slide, buttonId });
          if (!res.ok) {
            setError(res.error ?? "Aktion fehlgeschlagen.");
            return;
          }
          await onRefresh();
          setIndex((i) => Math.max(0, Math.min(i, count - 2)));
        }, 480);
      } finally {
        setBusyId(null);
      }
    },
    [slide, onOpen, onRefresh, runBusy, count]
  );

  if (!slide || count === 0) return null;

  const tone = slide.kickerTone ?? "sand";
  const dotColor =
    tone === "green"
      ? "var(--org-primary, var(--p2-primary, #2e7d52))"
      : "var(--p2-sand, #e8b04b)";

  return (
    <article
      className={cn("portal-dash-focus portal-dash-action-carousel", className)}
    >
      <div
        className="portal-dash-action-carousel-frame"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {count > 1 ? (
          <button
            type="button"
            className="portal-dash-action-side-btn portal-dash-action-side-btn--prev"
            onClick={goPrev}
            aria-label="Vorheriger Vorgang"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        <div className="portal-dash-action-carousel-main">
          <div className="portal-dash-focus-head">
            <div className="portal-dash-focus-kicker">
              <span
                className="portal-dash-focus-dot"
                style={{ background: dotColor }}
                aria-hidden
              />
              <span>{slide.kicker}</span>
            </div>
            <button
              type="button"
              className="portal-dash-focus-open"
              onClick={() => onOpen(slide.openId)}
            >
              Öffnen
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <h2 className="portal-dash-focus-title">{slide.title}</h2>
          {slide.subtitle ? (
            <p className="portal-dash-focus-sub">{slide.subtitle}</p>
          ) : null}

          {error ? (
            <p className="portal-dash-action-error" role="alert">
              {error}
            </p>
          ) : null}

          {slide.buttons.length > 0 ? (
            <div className="portal-dash-focus-actions">
              {slide.buttons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  disabled={busyId != null}
                  className={cn(
                    "portal-dash-focus-btn",
                    btn.variant === "primary" && "portal-dash-focus-btn--primary",
                    btn.variant === "secondary" &&
                      "portal-dash-focus-btn--secondary",
                    btn.variant === "danger" &&
                      "portal-dash-focus-btn--secondary portal-dash-action-btn--danger"
                  )}
                  onClick={() => void handleButton(btn.id)}
                >
                  {busyId === btn.id ? "Wird geladen…" : btn.label}
                </button>
              ))}
            </div>
          ) : null}

          {count > 1 ? (
            <div className="portal-dash-action-footer">
              <div className="portal-dash-action-dots" aria-hidden>
                {slides.map((s, i) => (
                  <span
                    key={`${s.openId}-${s.kind}-${i}`}
                    className={cn(
                      "portal-dash-action-dot",
                      i === safeIndex && "portal-dash-action-dot--active"
                    )}
                  />
                ))}
              </div>
              <span className="portal-dash-action-count" aria-live="polite">
                {safeIndex + 1}/{count}
              </span>
            </div>
          ) : null}
        </div>

        {count > 1 ? (
          <button
            type="button"
            className="portal-dash-action-side-btn portal-dash-action-side-btn--next"
            onClick={goNext}
            aria-label="Nächster Vorgang"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </article>
  );
}
