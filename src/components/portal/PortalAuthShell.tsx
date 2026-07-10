import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";

export function PortalAuthShell({
  title,
  subtitle,
  children,
  brand = "kunde",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  brand?: "kunde" | "partner";
}) {
  const brandLabel =
    brand === "partner" ? (
      <>
        Bärenwald <span className="text-accent">Partner</span>
      </>
    ) : (
      <>
        Mein<span className="text-accent">Bärenwald</span>
      </>
    );

  return (
    <div className="portal-ui flex min-h-screen flex-col items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo-mark-green.png"
            alt="Bärenwald"
            width={56}
            height={56}
            priority
          />
          <p className="mt-4 font-display text-xl font-semibold text-text-primary sm:text-2xl">
            {brandLabel}
          </p>
          <h1 className="mt-3 text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle ? (
            <p className="portal-text-body mt-1 text-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        <div className="card-bordered p-5 sm:p-6">{children}</div>
        <p className="portal-text-meta mt-8 text-center text-text-tertiary">
          <Link href="/" className="underline-offset-2 hover:underline">
            Zurück zur Website
          </Link>
        </p>
        <PortalLegalFooter variant={brand === "partner" ? "partner" : "kunde"} className="mt-4" />
      </div>
    </div>
  );
}
