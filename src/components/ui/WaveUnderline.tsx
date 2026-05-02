import type { ReactNode } from "react";

type WaveTone = "on-light" | "on-dark";

const STROKE: Record<WaveTone, string> = {
  "on-light": "#2E7D52",
  "on-dark": "#A8C5A0",
};

export function WaveUnderline({
  children,
  className = "",
  tone = "on-light",
}: {
  children: ReactNode;
  className?: string;
  tone?: WaveTone;
}) {
  return (
    <span className={`wave-wrap ${className}`.trim()}>
      {children}
      <svg
        className="wave-svg"
        viewBox="0 0 200 8"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M0,4 C25,0 50,8 75,4 C100,0 125,8 150,4 C175,0 200,8 200,4"
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
