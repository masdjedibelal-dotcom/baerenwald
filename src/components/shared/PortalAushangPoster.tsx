"use client";

import type { CSSProperties } from "react";

import {
  AUSHANG_BADGE,
  AUSHANG_FOOTER_NO_PHONE,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_EYEBROW,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_OBJEKT_LABEL,
  AUSHANG_PILL_HINT,
  AUSHANG_POWERED,
  AUSHANG_POWERED_BRAND,
  AUSHANG_STEPS,
  type AushangBrand,
  type AushangObjektView,
} from "@/lib/portal2/aushang";
import { buildMeldeQrUrl } from "@/lib/org/melde-url";
import { cn } from "@/lib/utils";

export type PortalAushangPosterProps = {
  brand: AushangBrand;
  objekt: AushangObjektView;
  meldeUrl: string;
  /** Preview-Breite px (Mock: 300 mobil / 430 desktop / 793 Print) */
  width: number;
  isPrint?: boolean;
  className?: string;
  id?: string;
};

/**
 * Mock `aushangPoster(o, W, isPrint)` — A4-Proportion, HV-Branding.
 * QR = scannbares Bild auf `meldeUrl` (E3), nicht Mock-qrMatrix.
 */
export function PortalAushangPoster({
  brand,
  objekt,
  meldeUrl,
  width,
  isPrint = false,
  className,
  id,
}: PortalAushangPosterProps) {
  const scale = width / 793;
  const px = (n: number) => Math.round(n * scale);
  const P = brand.primary;
  const DK = brand.primaryDk?.trim() || brand.primary;
  const SOFT = brand.soft?.trim() || "#E7F1E9";
  const logo = (brand.logoKuerzel?.trim() || brand.name.trim().charAt(0) || "H")
    .slice(0, 2)
    .toUpperCase();
  const height = Math.round((width * 297) / 210);
  const qrSrc = buildMeldeQrUrl(meldeUrl);
  const displayUrl = meldeUrl.replace(/^https?:\/\//i, "");

  return (
    <div
      id={id}
      className={cn("portal-aushang-poster", isPrint && "portal-aushang-poster--print", className)}
      style={
        {
          width,
          height,
          "--aushang-p": P,
          "--aushang-dk": DK,
          "--aushang-soft": SOFT,
          "--aushang-scale": String(scale),
        } as CSSProperties
      }
      data-aushang-print={isPrint ? "true" : undefined}
    >
      <header className="portal-aushang-head" style={{ padding: `${px(28)}px ${px(40)}px` }}>
        <div className="portal-aushang-head-brand" style={{ gap: px(14) }}>
          <div
            className="portal-aushang-logo"
            style={{
              width: px(48),
              height: px(48),
              borderRadius: px(12),
              fontSize: px(20),
            }}
          >
            {logo}
          </div>
          <div className="min-w-0">
            <div
              className="portal-aushang-org-name"
              style={{ fontSize: px(19) }}
            >
              {brand.name}
            </div>
            {brand.sub?.trim() ? (
              <div
                className="portal-aushang-org-sub"
                style={{ fontSize: px(12.5), marginTop: px(2) }}
              >
                {brand.sub}
              </div>
            ) : null}
          </div>
        </div>
        <div
          className="portal-aushang-badge"
          style={{
            fontSize: px(11),
            letterSpacing: px(1),
            borderRadius: 999,
            padding: `${px(6)}px ${px(12)}px`,
          }}
        >
          {AUSHANG_BADGE}
        </div>
      </header>

      <div
        className="portal-aushang-hero"
        style={{ padding: `${px(56)}px ${px(48)}px ${px(16)}px` }}
      >
        <div
          className="portal-aushang-eyebrow"
          style={{ gap: px(10), marginBottom: px(16) }}
        >
          <div style={{ width: px(28), height: px(2), background: P }} />
          <span
            style={{
              fontSize: px(14),
              fontWeight: 700,
              letterSpacing: px(2.5),
              textTransform: "uppercase",
              color: P,
            }}
          >
            {AUSHANG_HERO_EYEBROW}
          </span>
        </div>
        <div
          className="portal-aushang-headline"
          style={{ fontSize: px(56), letterSpacing: "-0.02em" }}
        >
          <div>{AUSHANG_HERO_LINE1}</div>
          <div style={{ color: P }}>{AUSHANG_HERO_LINE2}</div>
        </div>
        <p
          className="portal-aushang-hero-body"
          style={{
            fontSize: px(19),
            marginTop: px(16),
            maxWidth: px(480),
          }}
        >
          {AUSHANG_HERO_BODY}
        </p>
      </div>

      <div
        className="portal-aushang-qr-wrap"
        style={{ padding: `${px(26)}px ${px(48)}px ${px(4)}px` }}
      >
        <div className="portal-aushang-qr-frame" style={{ padding: px(26) }}>
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <span
              key={pos}
              className={`portal-aushang-corner portal-aushang-corner--${pos}`}
              style={{
                width: px(30),
                height: px(30),
                borderColor: P,
                borderWidth: px(3),
              }}
              aria-hidden
            />
          ))}
          <div
            className="portal-aushang-qr-card"
            style={{
              borderRadius: px(16),
              padding: px(18),
              boxShadow: isPrint
                ? "none"
                : "0 10px 30px -12px rgba(34,80,140,.35)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR-Code Melde-Link ${objekt.titel}`}
              width={px(288)}
              height={px(288)}
              className="portal-aushang-qr-img"
            />
            <div
              className="portal-aushang-qr-center"
              style={{
                width: px(58),
                height: px(58),
                borderRadius: px(15),
                borderWidth: px(3),
              }}
            >
              <div
                style={{
                  width: px(44),
                  height: px(44),
                  borderRadius: px(11),
                  background: P,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: px(19),
                  fontFamily: "var(--p2-font-head)",
                }}
              >
                {logo}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="portal-aushang-url-pill-wrap"
        style={{ marginTop: px(20) }}
      >
        <div
          className="portal-aushang-url-pill"
          style={{
            gap: px(8),
            borderRadius: 999,
            padding: `${px(9)}px ${px(18)}px`,
            background: SOFT,
          }}
        >
          <span style={{ fontSize: px(13), color: "#7a867f" }}>
            {AUSHANG_PILL_HINT}
          </span>
          <span
            style={{
              width: px(3),
              height: px(3),
              borderRadius: "50%",
              background: "#b9c2ba",
            }}
          />
          <span
            style={{ fontSize: px(14), fontWeight: 700, color: DK }}
            className="portal-aushang-url-text"
          >
            {displayUrl}
          </span>
        </div>
      </div>

      <div
        className="portal-aushang-steps"
        style={{ padding: `${px(40)}px ${px(52)}px ${px(20)}px` }}
      >
        <div
          className="portal-aushang-steps-line"
          style={{
            left: px(96),
            right: px(96),
            top: px(40) + px(23),
            height: px(2),
            background: `repeating-linear-gradient(90deg, ${SOFT} 0, ${SOFT} ${px(6)}px, transparent ${px(6)}px, transparent ${px(12)}px)`,
          }}
          aria-hidden
        />
        {AUSHANG_STEPS.map((step) => (
          <div key={step.n} className="portal-aushang-step">
            <div
              className="portal-aushang-step-n"
              style={{
                width: px(46),
                height: px(46),
                borderWidth: px(2),
                borderColor: P,
                color: P,
                fontSize: px(16),
                marginBottom: px(12),
              }}
            >
              {step.n}
            </div>
            <div style={{ fontWeight: 700, fontSize: px(17), color: "#22302a" }}>
              {step.title}
            </div>
            <div
              style={{
                fontSize: px(13.5),
                color: "#8a958d",
                lineHeight: 1.35,
                marginTop: px(5),
                padding: `0 ${px(8)}px`,
              }}
            >
              {step.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="portal-aushang-spacer" />

      <div
        className="portal-aushang-objekt"
        style={{
          margin: `0 ${px(48)}px`,
          padding: `${px(16)}px ${px(22)}px`,
          background: SOFT,
          borderRadius: px(14),
          gap: px(14),
        }}
      >
        <div
          style={{
            width: px(40),
            height: px(40),
            borderRadius: px(10),
            background: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: px(20),
            flexShrink: 0,
          }}
          aria-hidden
        >
          📍
        </div>
        <div>
          <div
            style={{
              fontSize: px(12),
              fontWeight: 700,
              letterSpacing: px(1.2),
              textTransform: "uppercase",
              color: P,
            }}
          >
            {AUSHANG_OBJEKT_LABEL}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: px(18),
              color: "#22302a",
              marginTop: px(2),
            }}
          >
            {objekt.titel}
          </div>
          {objekt.adresse.trim() &&
          objekt.adresse.trim() !== objekt.titel.trim() ? (
            <div
              style={{
                fontSize: px(14),
                color: "#5a6a62",
                marginTop: px(2),
              }}
            >
              {objekt.adresse}
            </div>
          ) : null}
        </div>
      </div>

      <footer
        className="portal-aushang-foot"
        style={{
          margin: `0 ${px(48)}px`,
          marginTop: px(20),
          paddingTop: px(18),
          paddingBottom: px(30),
        }}
      >
        <div style={{ fontSize: px(13), color: "#8a958d", lineHeight: 1.6 }}>
          <div>
            {AUSHANG_FOOTER_NO_PHONE}{" "}
            <span style={{ fontWeight: 700, color: "#3a4a42" }}>
              {brand.telefon?.trim() || "—"}
            </span>
          </div>
          <div>{brand.email?.trim() || ""}</div>
        </div>
        <div
          style={{
            fontSize: px(11),
            color: "#b3bcb6",
            textAlign: "right",
            lineHeight: 1.4,
          }}
        >
          {AUSHANG_POWERED}
          <br />
          <span style={{ fontWeight: 700, color: "#8a958d" }}>
            {AUSHANG_POWERED_BRAND}
          </span>
        </div>
      </footer>
    </div>
  );
}
