'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Leichtgewichtiger i-Hinweis für Funnel/Melde (Website).
 * Entspricht CRM `MockInfoTip` — 1–2 Sätze, kein Absatz unter H1.
 */
export function InfoTip({
  tip,
  label = 'Hinweis',
  className,
}: {
  tip: ReactNode
  label?: string
  className?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const tipRef = useRef<HTMLSpanElement>(null)

  return (
    <span
      className={cn('inline-flex align-middle relative', className)}
      style={{ verticalAlign: 'middle' }}
    >
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#5B6470] hover:bg-black/5"
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 10v6M12 7.5h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open ? (
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          tabIndex={-1}
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-w-[260px] rounded-lg border border-[var(--p2-line,#E5E3DF)] bg-white px-3 py-2 text-left text-[12.5px] leading-snug text-[#16201B] shadow-md"
        >
          {tip}
        </span>
      ) : null}
    </span>
  )
}
