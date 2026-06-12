"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { buildRechnerUrl } from "@/lib/products/build-rechner-url";
import { BAD_DEFAULT_PRODUKT_SLUG } from "@/lib/products/katalog-bad";

type Props = {
  className?: string;
  children?: ReactNode;
};

/** Kompakter Einstieg für Portal — verlinkt auf Katalog-Rechner. */
export function PortalProductPickerLink({ className, children }: Props) {
  return (
    <Link
      href={buildRechnerUrl({
        modus: "katalog",
        produkt: BAD_DEFAULT_PRODUKT_SLUG,
        quelle: "portal",
        next: "/portal",
      })}
      className={className}
    >
      {children ?? "Neue Anfrage"}
    </Link>
  );
}
