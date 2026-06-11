"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { OnboardingSlide } from "@/lib/onboarding/portal-slides";
import {
  markOnboardingCompleted,
  type OnboardingAudience,
} from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";

type OnboardingTourProps = {
  open: boolean;
  audience: OnboardingAudience;
  slides: OnboardingSlide[];
  onClose: () => void;
};

function slideImageSrc(audience: OnboardingAudience, imageBase: string, mobile: boolean): string {
  const vp = mobile ? "mobile" : "desktop";
  return `/images/onboarding/${audience}/${vp}/${imageBase}.png`;
}

export function OnboardingTour({ open, audience, slides, onClose }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    document.body.style.overflow = "hidden";
    return () => {
      mq.removeEventListener("change", update);
      document.body.style.overflow = "";
    };
  }, [open]);

  const finish = useCallback(() => {
    markOnboardingCompleted(audience);
    onClose();
  }, [audience, onClose]);

  if (!open || slides.length === 0) return null;

  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const imgSrc = slideImageSrc(audience, slide.imageBase, mobile);

  const shell = (
    <>
      <div
        className="onboarding-backdrop"
        aria-hidden
        onClick={finish}
      />
      <div
        className={cn("onboarding-shell", mobile && "onboarding-shell--mobile")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="onboarding-topbar">
          <button
            type="button"
            className="onboarding-skip"
            onClick={finish}
          >
            Überspringen
          </button>
          {!mobile ? (
            <button
              type="button"
              className="onboarding-close"
              onClick={finish}
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className={cn("onboarding-body", !mobile && "onboarding-body--desktop")}>
          <div className="onboarding-shot-wrap">
            <Image
              src={imgSrc}
              alt=""
              width={mobile ? 390 : 560}
              height={mobile ? 520 : 420}
              className="onboarding-shot"
              priority
            />
          </div>

          <div className="onboarding-copy">
            <p className="onboarding-eyebrow">{slide.eyebrow}</p>
            <h2 id="onboarding-title" className="onboarding-title">
              {slide.title}
            </h2>
            <p className="onboarding-text">{slide.body}</p>

            {slide.todos.length > 0 ? (
              <div className="onboarding-todos">
                <p className="onboarding-todos-label">Deine To-dos</p>
                <ul>
                  {slide.todos.map((todo) => (
                    <li key={todo}>{todo}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots" role="tablist" aria-label="Tour-Schritte">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Schritt ${i + 1}`}
                className={cn("onboarding-dot", i === index && "onboarding-dot--active")}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>

          <div className="onboarding-nav">
            {index > 0 ? (
              <button
                type="button"
                className="onboarding-nav-btn onboarding-nav-btn--ghost"
                onClick={() => setIndex((v) => v - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Zurück
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="onboarding-nav-btn onboarding-nav-btn--primary"
              onClick={() => (isLast ? finish() : setIndex((v) => v + 1))}
            >
              {isLast ? "Loslegen" : "Weiter"}
              {!isLast ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return <div className="onboarding-root">{shell}</div>;
}
