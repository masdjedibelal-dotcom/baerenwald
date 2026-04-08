"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SelectionTileProps {
  label: string;
  hint?: string;
  icon: ReactNode;
  priceTag?: string;
  expandText?: string;
  expandType?: "info" | "warn";
  selected: boolean;
  multi: boolean;
  onChange: (selected: boolean) => void;
  accentColor?: string;
  className?: string;
}

export function SelectionTile({
  label,
  hint,
  icon,
  priceTag,
  expandText,
  expandType = "info",
  selected,
  multi,
  onChange,
  accentColor = "#1B4332",
  className,
}: SelectionTileProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!selected)}
      className={cn(
        "w-full cursor-pointer rounded-[var(--r)] border border-[#e8e8e8] p-3 text-left transition-colors hover:border-[#bbb]",
        className
      )}
      style={
        selected
          ? {
              borderWidth: 1.5,
              borderColor: accentColor,
              backgroundColor: "#fafafa",
            }
          : undefined
      }
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex size-[26px] shrink-0 items-center justify-center rounded-md border border-[#e8e8e8] bg-[#f5f5f5]",
            !selected && "text-text-primary"
          )}
          style={
            selected
              ? {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                  color: "#fff",
                }
              : undefined
          }
        >
          <span className="flex size-4 items-center justify-center [&_svg]:size-4">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 pr-7">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-[13px] font-medium text-text-primary">{label}</span>
            {multi ? (
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded border border-[#e8e8e8] bg-white",
                  selected && "border-transparent text-white"
                )}
                style={
                  selected
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : undefined
                }
              >
                {selected ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : null}
              </span>
            ) : (
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-white p-0.5",
                  selected && "border-[1.5px]"
                )}
                style={selected ? { borderColor: accentColor } : undefined}
              >
                {selected ? (
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                ) : null}
              </span>
            )}
          </div>
          {hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[#666]">{hint}</p>
          ) : null}
          {priceTag ? (
            <span
              className="mt-[5px] inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: "#EAF3DE", color: "#27500A" }}
            >
              {priceTag}
            </span>
          ) : null}
        </div>
      </div>

      {selected && expandText ? (
        <div
          className={cn(
            "mt-2 rounded-r-md py-[7px] pl-2 pr-[9px] text-[11px] leading-snug",
            expandType === "info" &&
              "border-l-2 border-l-[#378ADD] bg-[#F6F8FE] text-[#315AA8]",
            expandType === "warn" &&
              "border-l-2 border-l-[#F2CFCF] bg-[#FFF7F7] text-[#C0392B]"
          )}
        >
          {expandText}
        </div>
      ) : null}
    </button>
  );
}
