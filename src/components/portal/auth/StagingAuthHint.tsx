"use client";

import { useEffect, useState } from "react";

import {
  STAGING_KUNDE_EMAIL,
  STAGING_PARTNER_EMAIL,
  STAGING_PORTAL_PASSWORD,
  isStagingClient,
} from "@/lib/staging";

export function StagingAuthHint({
  variant,
}: {
  variant: "kunde" | "partner";
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(isStagingClient());
  }, []);
  if (!show) return null;
  const email =
    variant === "partner" ? STAGING_PARTNER_EMAIL : STAGING_KUNDE_EMAIL;
  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
      Staging — {email} / {STAGING_PORTAL_PASSWORD}
    </p>
  );
}

