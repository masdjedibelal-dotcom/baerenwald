"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  onChange: (hasSignature: boolean, dataUrl: string | null) => void;
  className?: string;
  /** F5 — höheres Pad für Mobile / Querformat-Hinweis */
  large?: boolean;
};

/** Canvas-Unterschrift — TEIL G4 gemeinsames Signatur-Modul (D3/D7 Kunde/HV, D11 HW). */
export function SignatureCanvas({ onChange, className, large = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [hasSig, setHasSig] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const height = expanded || large ? 220 : 150;

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
      const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
      return {
        x: (clientX - r.left) * (cv!.width / r.width),
        y: (clientY - r.top) * (cv!.height / r.height),
      };
    }

    function emit() {
      onChangeRef.current(true, cv!.toDataURL("image/png"));
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
      setHasSig(true);
      emit();
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
  }, [height]);

  function clear() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    setHasSig(false);
    onChangeRef.current(false, null);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative rounded-xl border border-dashed border-border-default bg-[#fbfcfb]">
        <canvas
          ref={canvasRef}
          width={640}
          height={height}
          className="block w-full touch-none rounded-xl"
          style={{ minHeight: height }}
          aria-label="Unterschriftsfeld — mit Maus oder Finger zeichnen"
        />
        {!hasSig ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-tertiary">
            Hier mit Finger oder Stift unterschreiben
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={clear}
          className="text-xs text-text-tertiary underline"
        >
          Unterschrift löschen
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-accent underline sm:hidden"
        >
          {expanded ? "Feld verkleinern" : "Feld vergrößern"}
        </button>
      </div>
    </div>
  );
}

/** Alias G4 — gemeinsame Signatur-API. */
export { SignatureCanvas as PortalSignaturePad };
