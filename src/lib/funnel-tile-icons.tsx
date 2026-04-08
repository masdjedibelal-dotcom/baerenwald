"use client";

import type { ReactNode } from "react";

function I({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function defaultTileIcon(): ReactNode {
  return (
    <I className="size-4">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 9h18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </I>
  );
}

export function tileIconForStepValue(value: string): ReactNode {
  if (value.includes("bad") || value.includes("kueche"))
    return (
      <I className="size-4">
        <path
          d="M12 3v18M3 12h18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </I>
    );
  if (value.includes("garten") || value.includes("aussen"))
    return (
      <I className="size-4">
        <path
          d="M12 22c4-4 6-8 6-12a6 6 0 10-12 0c0 4 2 8 6 12z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </I>
    );
  if (value.includes("heizung") || value.includes("wasser"))
    return (
      <I className="size-4">
        <path
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </I>
    );
  return defaultTileIcon();
}
