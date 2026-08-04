"use client";

import Image from "next/image";

import {
  AUTH_BRAND_BODY_BW,
  AUTH_BRAND_BODY_WL,
  AUTH_BRAND_BULLETS,
  AUTH_BRAND_POWERED,
  AUTH_BRAND_TAGLINE_BW,
  AUTH_BRAND_TAGLINE_WL,
  authBrandName,
  authWL,
  type AuthPortalRole,
} from "@/lib/portal2/auth";
import { cn } from "@/lib/utils";

type Props = {
  role: AuthPortalRole;
  orgName?: string | null;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  primaryDk?: string | null;
  className?: string;
};

/**
 * Mock `authBrand()` — linke Spalte; WL = HV-Farben.
 * Bärenwald-Portale: Marke = Logo (nicht Buchstabe „B“).
 */
export function PortalAuthBrandPanel({
  role,
  orgName,
  orgSub,
  logoKuerzel,
  primaryDk,
  className,
}: Props) {
  const wl = authWL(role);
  const name = authBrandName(role, orgName);
  const bg = wl
    ? primaryDk?.trim() || "var(--org-primary-dk, #1a3d2b)"
    : "#1a3d2b";
  const wlMark = (
    logoKuerzel?.trim() ||
    name.trim().charAt(0) ||
    "H"
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn("portal-auth-brand", className)}
      style={{ background: bg }}
    >
      <div className="portal-auth-brand-head">
        {wl ? (
          <div className="portal-auth-brand-mark" style={{ color: bg }}>
            {wlMark}
          </div>
        ) : (
          <Image
            src="/logo-mark-white.png"
            alt="Bärenwald"
            width={40}
            height={40}
            priority
            className="portal-auth-brand-logo"
          />
        )}
        <div>
          <div className="portal-auth-brand-name">{name}</div>
          {wl && orgSub?.trim() ? (
            <div className="portal-auth-brand-sub">{orgSub}</div>
          ) : null}
        </div>
      </div>

      <div className="portal-auth-brand-mid">
        <p className="portal-auth-brand-tagline">
          {wl ? AUTH_BRAND_TAGLINE_WL : AUTH_BRAND_TAGLINE_BW}
        </p>
        <p className="portal-auth-brand-body">
          {wl ? AUTH_BRAND_BODY_WL : AUTH_BRAND_BODY_BW}
        </p>
      </div>

      <ul className="portal-auth-brand-bullets">
        {AUTH_BRAND_BULLETS.map(([i, t]) => (
          <li key={t}>
            <span aria-hidden>{i}</span>
            {t}
          </li>
        ))}
      </ul>

      {wl ? (
        <p className="portal-auth-brand-powered">{AUTH_BRAND_POWERED}</p>
      ) : null}
    </aside>
  );
}
