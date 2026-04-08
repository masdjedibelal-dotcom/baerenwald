"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  getSlotsForDay,
  isSlotAlwaysFull,
} from "@/lib/calendar-seed-rng";
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
  accentColor?: string;
  className?: string;
}

export function CalendarPicker({
  selectedSlot,
  onSlotSelect,
  accentColor = "#1B4332",
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
    <div className={cn("fade-in space-y-2.5", className)}>
      <div className="overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-4 py-[13px]">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex size-7 items-center justify-center rounded-[7px] border border-[#e8e8e8]"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="size-4 text-text-primary" />
          </button>
          <span className="text-[14px] font-semibold capitalize text-text-primary">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex size-7 items-center justify-center rounded-[7px] border border-[#e8e8e8]"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="size-4 text-text-primary" />
          </button>
        </div>

        <div className="px-3.5 py-3">
          <div className="grid grid-cols-7 gap-[3px] text-center text-[11px] font-medium text-[#999]">
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
                <div key={cell.toISOString()} className="aspect-square min-h-[36px] p-0">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setPickedDay(cell);
                      setPickedTime(null);
                    }}
                    className={cn(
                      "relative flex size-full items-center justify-center rounded-[7px] text-[13px]",
                      disabled && "cursor-default text-[#ddd]",
                      !disabled &&
                        !sel &&
                        "cursor-pointer font-medium text-text-primary hover:bg-[#f5f5f5]",
                      sel && "text-white"
                    )}
                    style={
                      sel
                        ? { backgroundColor: accentColor }
                        : todayCell && !sel
                          ? {
                              boxShadow: "inset 0 0 0 1px #e8e8e8",
                            }
                          : undefined
                    }
                  >
                    {cell.getDate()}
                    {!disabled && hasSlots ? (
                      <span
                        className={cn(
                          "absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full",
                          sel ? "bg-white" : "bg-funnel-accent"
                        )}
                        style={!sel ? { backgroundColor: accentColor } : undefined}
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
          <p className="mb-2 text-[12px] font-medium text-[#666]">{dayLabel}</p>
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
                    "rounded-[9px] border border-[#e8e8e8] px-1.5 py-[9px] text-center transition-colors",
                    full &&
                      "cursor-not-allowed opacity-35 line-through",
                    sel && "bg-[#fafafa]"
                  )}
                  style={
                    sel
                      ? {
                          borderWidth: 1.5,
                          borderColor: accentColor,
                        }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "block text-[13px] font-medium",
                      sel ? "" : "text-text-primary",
                      full && "text-text-primary"
                    )}
                    style={sel ? { color: accentColor } : undefined}
                  >
                    {time}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#999]">
                    30 Min.
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {pickedDay && pickedTime && !isSlotAlwaysFull(pickedTime) ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--r)] border border-[#e8e8e8] bg-[#fafafa] px-[13px] py-[11px]">
          <div>
            <p className="text-[13px] font-medium text-text-primary">{confirmLabel}</p>
            <p className="text-[11px] text-[#666]">
              Kostenloser Vor-Ort-Termin · 30 Min.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
