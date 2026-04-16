"use client";

import { useState } from "react";

import { CalendarPicker } from "@/components/funnel/CalendarPicker";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import type { SelectedSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface HWLeadFormProps {
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  selectedSlot: SelectedSlot | null;
  onSlotSelect: (date: Date, time: string) => void;
  name: string;
  email: string;
  telefon: string;
  onFieldChange: (
    field: "name" | "email" | "telefon",
    value: string
  ) => void;
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function HWLeadForm({
  photos,
  onPhotosChange,
  selectedSlot,
  onSlotSelect,
  name,
  email,
  telefon,
  onFieldChange,
  formId,
  onSubmit,
  className,
}: HWLeadFormProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div id="lead-form" className={cn(className)}>
      <PhotoUpload
        files={photos}
        onChange={onPhotosChange}
        className="mb-4"
        showCompareOfferHint={true}
      />

      <div className="calendar-opt-wrap mb-6">
        <button
          type="button"
          className="calendar-opt-trigger"
          onClick={() => setShowCalendar((v) => !v)}
          aria-expanded={showCalendar}
        >
          <span className="calendar-opt-icon" aria-hidden>
            📅
          </span>
          <div className="min-w-0 flex-1">
            <div className="calendar-opt-title">
              Wunschtermin angeben (optional)
            </div>
            <div className="calendar-opt-sub">
              Wir prüfen die Verfügbarkeit und bestätigen in 24h
            </div>
          </div>
          <svg
            className={cn(
              "calendar-opt-chevron shrink-0 text-text-tertiary transition-transform duration-200",
              showCalendar && "rotate-180"
            )}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {showCalendar ? (
          <div className="calendar-opt-body">
            <CalendarPicker
              selectedSlot={selectedSlot}
              onSlotSelect={onSlotSelect}
            />
          </div>
        ) : null}
      </div>

      <form id={formId} onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="name"
            autoCapitalize="words"
            className="funnel-input"
            placeholder="Name"
            value={name}
            onChange={(e) => onFieldChange("name", e.target.value)}
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="funnel-input"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => onFieldChange("email", e.target.value)}
          />
        </div>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="funnel-input"
          placeholder="+49 151 23456789"
          value={telefon}
          onChange={(e) => onFieldChange("telefon", e.target.value)}
        />
        <p className="text-[11px] leading-relaxed text-text-tertiary">
          Mit Absenden akzeptierst du, dass wir dich zum Termin / Angebot
          kontaktieren. Du kannst der Nutzung jederzeit widersprechen.
        </p>
      </form>
    </div>
  );
}
