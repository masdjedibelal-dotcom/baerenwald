"use client";

import type { Situation } from "@/lib/types";
import { cn } from "@/lib/utils";

const stroke = "currentColor";
const strokeW = 1.5;

function IconSvg({
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
      className={cn(className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function SituationIconPath({ situation }: { situation: Situation }) {
  switch (situation) {
    case "renovierung":
      return (
        <IconSvg>
          <path
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 22V12h6v10"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconSvg>
      );
    case "neubau":
      return (
        <IconSvg>
          <rect
            x="2"
            y="7"
            width="20"
            height="14"
            rx="2"
            stroke={stroke}
            strokeWidth={strokeW}
          />
          <path
            d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
            stroke={stroke}
            strokeWidth={strokeW}
          />
          <path
            d="M12 12v4M10 14h4"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        </IconSvg>
      );
    case "akut":
      return (
        <IconSvg>
          <path
            d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconSvg>
      );
    case "pflege":
      return (
        <IconSvg>
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconSvg>
      );
    case "b2b":
      return (
        <IconSvg>
          <rect
            x="2"
            y="3"
            width="20"
            height="14"
            rx="2"
            stroke={stroke}
            strokeWidth={strokeW}
          />
          <path
            d="M8 21h8M12 17v4"
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        </IconSvg>
      );
    default:
      return null;
  }
}
