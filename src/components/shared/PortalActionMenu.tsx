"use client";

import {
  useCallback,
  useState,
  type ReactNode,
} from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { cn } from "@/lib/utils";

export type PortalActionMenuItem = {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  /** Nested submenu — ersetzt die Liste im gleichen Sheet. */
  submenu?: PortalActionMenuItem[];
  /** Visueller Trenner vor diesem Eintrag. */
  dividerBefore?: boolean;
};

export type PortalActionMenuProps = {
  items: PortalActionMenuItem[];
  title?: string;
  /** Inhalt des Trigger-Buttons. Default: ⋯ */
  trigger?: ReactNode;
  triggerClassName?: string;
  /** aria-label wenn Trigger nur Symbol ist. */
  triggerLabel?: string;
  className?: string;
  /** Controlled open (optional). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Action-Menü über PortalModalShell `edit` (mobil Bottom Sheet, Desktop Side-Over).
 * Nested: Item mit `submenu` öffnet Unterliste im gleichen Sheet (Aushang-Pattern).
 */
export function PortalActionMenu({
  items,
  title = "Aktionen",
  trigger,
  triggerClassName,
  triggerLabel = "Weitere Aktionen",
  className,
  open: openProp,
  onOpenChange,
}: PortalActionMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange]
  );

  const [stack, setStack] = useState<
    Array<{ title: string; items: PortalActionMenuItem[] }>
  >([]);

  const current =
    stack.length > 0
      ? stack[stack.length - 1]!
      : { title, items };

  function close() {
    setOpen(false);
    setStack([]);
  }

  function run(item: PortalActionMenuItem) {
    if (item.submenu?.length) {
      setStack((s) => [
        ...s,
        { title: item.label, items: item.submenu! },
      ]);
      return;
    }
    close();
    item.onClick?.();
  }

  const isIconOnly = trigger == null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        className={cn(
          isIconOnly
            ? "flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-base text-text-secondary"
            : undefined,
          triggerClassName
        )}
        aria-label={isIconOnly ? triggerLabel : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setStack([]);
          setOpen(true);
        }}
      >
        {trigger ?? "⋯"}
      </button>

      <PortalModalShell
        open={open}
        title={current.title}
        onClose={close}
        variant="edit"
        headerExtra={
          stack.length > 0 ? (
            <button
              type="button"
              className="portal-text-meta rounded-lg px-2 py-1 font-semibold text-accent"
              onClick={() => setStack((s) => s.slice(0, -1))}
            >
              ‹ Zurück
            </button>
          ) : null
        }
      >
        <PortalActionMenuList items={current.items} onSelect={run} />
      </PortalModalShell>
    </div>
  );
}

export function PortalActionMenuList({
  items,
  onSelect,
}: {
  items: PortalActionMenuItem[];
  onSelect: (item: PortalActionMenuItem) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`}>
          {item.dividerBefore ? (
            <div className="my-1.5 border-t border-border-default" />
          ) : null}
          <button
            type="button"
            className={cn(
              "portal-text-body flex w-full items-center justify-between gap-2 rounded-[10px] px-3.5 py-3.5 text-left font-semibold",
              item.danger
                ? "portal-danger hover:bg-[var(--p2-danger-soft)]"
                : "text-text-primary hover:bg-muted"
            )}
            onClick={() => onSelect(item)}
          >
            <span>{item.label}</span>
            {item.submenu?.length ? (
              <span className="text-text-tertiary" aria-hidden>
                ›
              </span>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Aushang-Untermenü: Link · QR · PDF — für nested ActionMenu-Pattern. */
export function buildAushangActionItems(opts: {
  onCopyLink: () => void;
  onQr: () => void;
  onPdf: () => void;
  labels?: {
    copyLink?: string;
    qr?: string;
    pdf?: string;
  };
}): PortalActionMenuItem[] {
  return [
    {
      label: opts.labels?.copyLink ?? "Link kopieren",
      onClick: opts.onCopyLink,
    },
    {
      label: opts.labels?.qr ?? "QR-Code",
      onClick: opts.onQr,
    },
    {
      label: opts.labels?.pdf ?? "Aushang PDF",
      onClick: opts.onPdf,
    },
  ];
}

/** Nested-Eintrag „Aushang“ mit Untermenü (Link / QR / PDF). */
export function buildAushangNestedItem(opts: {
  onCopyLink: () => void;
  onQr: () => void;
  onPdf: () => void;
  label?: string;
}): PortalActionMenuItem {
  return {
    label: opts.label ?? "Aushang",
    submenu: buildAushangActionItems(opts),
  };
}
