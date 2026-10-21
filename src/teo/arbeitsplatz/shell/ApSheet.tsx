'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { MockBtn, MockIcon } from '@/teo/arbeitsplatz/kit'

/**
 * Seitenfenster zum Bearbeiten — Aussehen wie CRM-EditorSheet (editor-sheet-Klassen).
 * Speichern unten rechts, Abbrechen links, Esc/Klick daneben schließt.
 */
export function ApSheet({
  open,
  titel,
  onClose,
  onSpeichern,
  speichernLabel = 'Speichern',
  laeuft,
  gefahr,
  children,
}: {
  open: boolean
  titel: string
  onClose: () => void
  onSpeichern?: () => void
  speichernLabel?: string
  laeuft?: boolean
  /** Optionaler roter Knopf links (z. B. Löschen) */
  gefahr?: { label: string; onClick: () => void }
  children: ReactNode
}) {
  const [bereit, setBereit] = useState(false)
  useEffect(() => setBereit(true), [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSpeichern) onSpeichern()
    }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, onClose, onSpeichern])
  if (!open || !bereit) return null

  return createPortal(
    <div
      className="editor-sheet-overlay editor-sheet-overlay--slide justify-end"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="editor-sheet editor-sheet--slide absolute right-0 top-0 bottom-0 h-full ml-auto" role="dialog" aria-modal="true" aria-label={titel}>
        <header className="editor-sheet__header">
          <MockBtn className="editor-sheet__icon-btn" type="button" onClick={onClose} aria-label="Schließen">
            <MockIcon n="x" ctx="default" size={20} />
          </MockBtn>
          <div className="editor-sheet__title-block">
            <h2 className="editor-sheet__title">{titel}</h2>
          </div>
          <div className="editor-sheet__header-end" />
        </header>
        <div className="editor-sheet__body">{children}</div>
        {onSpeichern || gefahr ? (
          <div className="editor-sheet__footer">
            <div className="sheet-footer-actions">
              <MockBtn kind="secondary" type="button" onClick={onClose} disabled={laeuft}>
                Abbrechen
              </MockBtn>
              {gefahr ? (
                <MockBtn kind="danger" type="button" onClick={gefahr.onClick} disabled={laeuft}>
                  {gefahr.label}
                </MockBtn>
              ) : null}
              {onSpeichern ? (
                <MockBtn kind="primary" type="button" onClick={onSpeichern} disabled={laeuft}>
                  {laeuft ? 'Speichert …' : speichernLabel}
                </MockBtn>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
