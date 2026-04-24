"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getSlotsForDay, isSlotAlwaysFull } from "@/lib/calendar-seed-rng";
import type { SelectedSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export interface CalendarPickerProps {
  selectedSlot: SelectedSlot | null;
  onSlotSelect: (date: Date, time: string) => void;
  /** Optional: z. B. Fokus auf Lead-Form oder zusätzliche Aktion */
  onConfirmBook?: () => void;
  className?: string;
}

export function CalendarPicker({
  selectedSlot,
  onSlotSelect,
  onConfirmBook,
  className,
}: CalendarPickerProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [pickedDay, setPickedDay] = useState<Date | null>(() => {
    if (!selectedSlot?.dateISO) return null;
    const d = new Date(selectedSlot.dateISO);
    return Number.isNaN(d.getTime()) ? null : d;
  });
  const [pickedTime, setPickedTime] = useState<string | null>(
    selectedSlot?.time ?? null
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const { cells } = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const mondayIndex = startDow === 0 ? 6 : startDow - 1;
    const out: (Date | null)[] = [];
    for (let i = 0; i < mondayIndex; i++) out.push(null);
    const dim = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      out.push(new Date(year, month, d));
    }
    while (out.length % 7 !== 0) out.push(null);
    while (out.length < 42) out.push(null);
    return { cells: out };
  }, [year, month]);

  const monthTitle = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  const slotsForPicked = pickedDay ? getSlotsForDay(pickedDay, today) : [];

  const dayLabel =
    pickedDay &&
    new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(pickedDay);

  const confirmLabel =
    pickedDay && pickedTime
      ? `${new Intl.DateTimeFormat("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(pickedDay)} · ${pickedTime} Uhr`
      : "";

  const pickSlot = (time: string) => {
    if (!pickedDay || isSlotAlwaysFull(time)) return;
    setPickedTime(time);
    onSlotSelect(pickedDay, time);
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <div>
        <p className="text-sm font-semibold text-text-primary">
          Wunschtermin für den Vor-Ort-Termin
        </p>
        <p className="mb-3.5 mt-1 text-xs leading-relaxed text-text-tertiary">
          Wähle einen Wunschtermin — wir bestätigen die Verfügbarkeit innerhalb
          von 48h.
        </p>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-border-default bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3.5">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex size-7 items-center justify-center rounded-lg border border-border-default"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="size-4 text-text-primary" />
          </button>
          <span className="text-sm font-semibold capitalize text-text-primary">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex size-7 items-center justify-center rounded-lg border border-border-default"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="size-4 text-text-primary" />
          </button>
        </div>

        <div className="px-3.5 py-3">
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-text-tertiary">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) {
                return (
                  <div
                    key={`e-${i}`}
                    className="aspect-square min-h-[36px]"
                  />
                );
              }
              const past = startOfDay(cell) < startOfDay(today);
              const sunday = cell.getDay() === 0;
              const slotList = getSlotsForDay(cell, today);
              const hasSlots = slotList.length > 0;
              const disabled = past || sunday || !hasSlots;
              const sel = pickedDay && isSameDay(cell, pickedDay);
              const todayCell = isToday(cell);

              return (
                <div
                  key={cell.toISOString()}
                  className="aspect-square min-h-[36px] p-0"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setPickedDay(cell);
                      setPickedTime(null);
                    }}
                    className={cn(
                      "relative flex size-full items-center justify-center rounded-lg text-[13px]",
                      disabled && "cursor-default opacity-40",
                      !disabled && !sel && "funnel-tile-hover cursor-pointer font-medium text-text-primary",
                      sel && "funnel-tile-selected font-medium text-text-primary",
                      todayCell && !sel && "ring-1 ring-inset ring-border-default"
                    )}
                  >
                    {cell.getDate()}
                    {!disabled && hasSlots ? (
                      <span
                        className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-funnel-accent"
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {pickedDay && slotsForPicked.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-text-secondary">
            {dayLabel}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {slotsForPicked.map((time) => {
              const full = isSlotAlwaysFull(time);
              const sel = pickedTime === time && !full;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={full}
                  onClick={() => pickSlot(time)}
                  className={cn(
                    "rounded-lg border border-border-default px-1.5 py-2 text-center transition-colors",
                    full && "cursor-not-allowed opacity-35 line-through",
                    sel && "funnel-tile-selected",
                    !full && !sel && "funnel-tile-hover"
                  )}
                >
                  <span className="block text-[13px] font-medium text-text-primary">
                    {time}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-text-tertiary">
                    30 Min.
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {pickedDay && pickedTime && !isSlotAlwaysFull(pickedTime) ? (
        <div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {confirmLabel}
              </p>
              <p className="text-[11px] text-text-secondary">
                Kostenloser Vor-Ort-Termin · 30 Min.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onConfirmBook?.()}
              className="shrink-0 rounded-full bg-funnel-accent px-4 py-2 text-xs font-semibold text-white"
            >
              Wunschtermin anfragen →
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-text-tertiary">
            Kein garantierter Termin — wir prüfen die Verfügbarkeit und
            bestätigen per Telefon oder E-Mail.
          </p>
        </div>
      ) : null}
    </div>
  );
}
