"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  onChange: (hasSignature: boolean, dataUrl: string | null) => void;
  className?: string;
};

/** Canvas-Unterschrift — TEIL G4 gemeinsames Signatur-Modul (D3/D7 Kunde/HV, D11 HW). */
export function SignatureCanvas({ onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1c211e";

    function pos(e: MouseEvent | TouchEvent) {
      const r = cv!.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - r.left) * (cv!.width / r.width),
        y: (clientY - r.top) * (cv!.height / r.height),
      };
    }

    function start(e: MouseEvent | TouchEvent) {
      drawingRef.current = true;
      const p = pos(e);
      ctx!.beginPath();
      ctx!.moveTo(p.x, p.y);
      e.preventDefault();
    }

    function move(e: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx!.lineTo(p.x, p.y);
      ctx!.stroke();
      if (!hasSig) {
        setHasSig(true);
        onChange(true, cv!.toDataURL("image/png"));
      } else {
        onChange(true, cv!.toDataURL("image/png"));
      }
      e.preventDefault();
    }

    function end() {
      drawingRef.current = false;
    }

    cv.addEventListener("mousedown", start);
    cv.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    cv.addEventListener("touchstart", start, { passive: false });
    cv.addEventListener("touchmove", move, { passive: false });
    cv.addEventListener("touchend", end);

    return () => {
      cv.removeEventListener("mousedown", start);
      cv.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      cv.removeEventListener("touchstart", start);
      cv.removeEventListener("touchmove", move);
      cv.removeEventListener("touchend", end);
    };
  }, [hasSig, onChange]);

  function clear() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    setHasSig(false);
    onChange(false, null);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative rounded-xl border border-dashed border-border-default bg-[#fbfcfb]">
        <canvas
          ref={canvasRef}
          width={640}
          height={150}
          className="block w-full touch-none rounded-xl"
          aria-label="Unterschriftsfeld — mit Maus oder Finger zeichnen"
        />
        {!hasSig ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-tertiary">
            Hier mit Maus oder Finger unterschreiben
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-text-tertiary underline"
      >
        Unterschrift löschen
      </button>
    </div>
  );
}

/** Alias G4 — gemeinsame Signatur-API. */
export { SignatureCanvas as PortalSignaturePad };
