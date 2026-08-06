"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Upload } from "lucide-react";

import {
  loadPartnerFachdokuSlots,
  uploadPartnerFachdokuSlot,
} from "@/app/actions/partner-fachdoku";
import type { FachdokuSlotView } from "@/lib/partner/fachdoku-slots";
import { fachdokuOffenCount } from "@/lib/partner/fachdoku-slots";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  auftragId: string;
  className?: string;
  /** Kompakter Hinweis ohne Liste (z. B. Abnahme-Tab). */
  variant?: "card" | "hint";
  onSlotsChange?: (slots: FachdokuSlotView[]) => void;
};

export function PartnerFachdokuSlots({
  auftragId,
  className,
  variant = "card",
  onSlotsChange,
}: Props) {
  const [slots, setSlots] = useState<FachdokuSlotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const apply = useCallback(
    (next: FachdokuSlotView[]) => {
      setSlots(next);
      onSlotsChange?.(next);
    },
    [onSlotsChange]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadPartnerFachdokuSlots(auftragId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        apply([]);
        return;
      }
      apply(res.slots);
    });
    return () => {
      cancelled = true;
    };
  }, [auftragId, apply]);

  async function onUpload(slotId: string, file: File) {
    setBusyId(slotId);
    const fd = new FormData();
    fd.set("auftragId", auftragId);
    fd.set("slotId", slotId);
    fd.set("file", file);
    const res = await uploadPartnerFachdokuSlot(fd);
    setBusyId(null);
    if (!res.ok) {
      portalToastError("Upload fehlgeschlagen", res.error);
      return;
    }
    portalToastSuccess("Fachnachweis hochgeladen", "Der Slot ist erledigt.");
    apply(res.slots);
  }

  if (loading) {
    if (variant === "hint") return null;
    return (
      <p className={cn("portal-text-meta text-text-tertiary", className)}>
        Fachnachweise werden geladen…
      </p>
    );
  }

  if (!slots.length) return null;

  const offen = fachdokuOffenCount(slots);

  if (variant === "hint") {
    if (offen === 0) return null;
    return (
      <div
        className={cn(
          "rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950",
          className
        )}
      >
        <p className="font-semibold">
          Noch {offen} Fachnachweis{offen === 1 ? "" : "e"} offen
        </p>
        <p className="mt-0.5 text-[12.5px] text-amber-900/90">
          Abnahme ist trotzdem möglich — Protokoll bitte nachreichen (Tab
          Dokumentation).
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-[12px] border bg-white",
        className
      )}
      style={{ borderColor: PORTAL_VAR.line }}
    >
      <div className="border-b px-3.5 py-3" style={{ borderColor: PORTAL_VAR.line2 }}>
        <h3 className="portal-text-title text-[15px]">Fachnachweise</h3>
        <p className="portal-text-meta mt-0.5">
          {offen > 0
            ? `${offen} offen — Abnahme wird nicht blockiert`
            : "Alle Nachweise hochgeladen"}
        </p>
      </div>
      <ul>
        {slots.map((s) => {
          const done = String(s.status).toLowerCase() === "erledigt";
          const href = s.signed_url?.trim();
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 border-b px-3.5 py-2.5 last:border-b-0"
              style={{ borderColor: PORTAL_VAR.line2 }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-text-primary">
                  {s.label}
                </p>
                <p className="portal-text-meta mt-0.5">
                  {done
                    ? s.datei_name?.trim() || "Hochgeladen"
                    : "Bitte Protokoll hochladen"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                  done
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                )}
              >
                {done ? "Erledigt" : "Offen"}
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border"
                  style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.sub }}
                  title="Ansehen"
                  aria-label="Ansehen"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
              <input
                ref={(el) => {
                  inputRefs.current[s.id] = el;
                }}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onUpload(s.id, f);
                }}
              />
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => inputRefs.current[s.id]?.click()}
                className="inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[12px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: PORTAL_VAR.line,
                  color: PORTAL_VAR.sub,
                  background: "#fff",
                }}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {busyId === s.id ? "…" : done ? "Ersetzen" : "Upload"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
