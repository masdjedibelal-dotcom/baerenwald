"use client";

import type { ReactNode } from "react";

import "./conversion-widget.css";

type Props = {
  id?: string;
  eyebrow?: string;
  h2?: string;
  sub?: string;
  notfall?: boolean;
  variant?: "default" | "hero";
  children?: ReactNode;
  footer?: ReactNode;
  stickyBar?: ReactNode;
};

export function ConversionWidget({
  id,
  eyebrow,
  h2,
  sub,
  notfall = false,
  variant = "default",
  children,
  footer,
  stickyBar,
}: Props) {
  const isHero = variant === "hero";

  return (
    <section
      className={`conversion-widget-section${notfall ? " conversion-widget-section--notfall" : ""}${isHero ? " conversion-widget-section--hero" : ""}`}
      id={id}
    >
      <div className="conversion-widget-wrap">
        {isHero ? (
          <div className="conversion-widget-hero-inner">{children}</div>
        ) : (
          <div className="conversion-widget-panel">
            {eyebrow || h2 ? (
              <header className="conversion-widget-header">
                {eyebrow ? (
                  <span className="conversion-widget-eyebrow">{eyebrow}</span>
                ) : null}
                {h2 ? <h2 className="conversion-widget-h2">{h2}</h2> : null}
                {sub ? <p className="conversion-widget-sub">{sub}</p> : null}
              </header>
            ) : null}

            {children}

            {footer ? <div className="conversion-widget-footer">{footer}</div> : null}
          </div>
        )}
      </div>

      {stickyBar}
    </section>
  );
}
