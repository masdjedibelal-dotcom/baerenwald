'use client'
import { SiteIcon } from "@/components/ui/SiteIcon";

import { useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Leichtgewichtiger i-Hinweis für Funnel/Melde/Portal.
 * Popover-Breite responsiv — auf schmalen Tiles rechts ausrichten (`popoverAlign="end"`).
 */
export function InfoTip({
  tip,
  label = 'Hinweis',
  className,
  popoverAlign = 'start',
}: {
  tip: ReactNode
  label?: string
  className?: string
  /** `end` = Popover am Button rechtsbündig (KPI-Kacheln) */
  popoverAlign?: 'start' | 'end'
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)

  return (
    <span
      className={cn('relative inline-flex shrink-0 align-middle', className)}
      style={{ verticalAlign: 'middle' }}
    >
      <button
        type="button"
        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-pill text-[var(--p2-sub)] hover:bg-black/5"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        title={typeof tip === 'string' ? tip : label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!tipRef.current?.contains(document.activeElement)) setOpen(false)
          }, 0)
        }}
      >
        <SiteIcon n="info-circle" ctx="muted" size={14} />
      </button>
      {open ? (
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          tabIndex={-1}
          className={cn(
            'absolute top-[calc(100%+6px)] z-50 rounded-card border border-[var(--p2-line)] bg-white px-3 py-2 text-left text-fs-meta leading-snug text-[var(--p2-ink)] shadow-md',
            'w-max min-w-[11rem] max-w-[min(18rem,calc(100vw-2rem))] sm:min-w-[13rem] sm:max-w-[20rem]',
            popoverAlign === 'end' ? 'right-0' : 'left-0'
          )}
        >
          {tip}
        </span>
      ) : null}
    </span>
  )
}
