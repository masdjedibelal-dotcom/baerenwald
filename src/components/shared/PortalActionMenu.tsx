"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { cn } from "@/lib/utils";

export type PortalActionMenuItem = {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  /** Nested submenu — ersetzt die Liste im gleichen Sheet/Popover. */
  submenu?: PortalActionMenuItem[];
  /** Visueller Trenner vor diesem Eintrag. */
  dividerBefore?: boolean;
  disabled?: boolean;
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
  /**
   * `popover` — verankertes Dropdown am Trigger (Default für ⋯-Menüs).
   * `sheet` — mobil Bottom Sheet / Desktop Side-Over (nur wenn explizit gewünscht).
   */
  variant?: "sheet" | "popover";
};

/**
 * Action-Menü: Popover am Trigger (⋯) oder optional Sheet/Side-Over.
 * Nested: Item mit `submenu` öffnet Unterliste.
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
  variant = "popover",
}: PortalActionMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

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
    if (item.disabled) return;
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || variant !== "popover") {
      setPanelPos(null);
      return;
    }
    function place() {
      const btn = triggerRef.current;
      const panel = panelRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const pw = panel?.offsetWidth ?? 200;
      const ph = panel?.offsetHeight ?? 0;
      const gap = 6;
      let left = r.right - pw;
      let top = r.bottom + gap;
      left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
      if (top + ph > window.innerHeight - 8 && r.top - gap - ph > 8) {
        top = r.top - gap - ph;
      }
      setPanelPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, variant, stack.length]);

  useEffect(() => {
    if (!open || variant !== "popover") return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
      setStack([]);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setStack([]);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, variant, setOpen]);

  const isIconOnly = trigger == null;

  const popoverPanel =
    variant === "popover" && open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={current.title}
            className="fixed z-[80] min-w-[12.5rem] overflow-hidden rounded-[12px] border border-[var(--p2-line,rgba(0,0,0,0.08))] bg-white py-1.5 shadow-[0_8px_28px_rgba(20,32,25,0.12)]"
            style={{
              top: panelPos?.top ?? -9999,
              left: panelPos?.left ?? -9999,
              visibility: panelPos ? "visible" : "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {stack.length > 0 ? (
              <button
                type="button"
                className="portal-text-meta flex w-full items-center gap-1 px-3.5 py-2 text-left font-semibold text-accent hover:bg-muted"
                onClick={() => setStack((s) => s.slice(0, -1))}
              >
                ‹ Zurück
              </button>
            ) : null}
            <PortalActionMenuList
              items={current.items}
              onSelect={run}
              compact
            />
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          isIconOnly
            ? "flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-base text-text-secondary"
            : undefined,
          triggerClassName
        )}
        aria-label={isIconOnly ? triggerLabel : undefined}
        aria-expanded={open}
        aria-haspopup={variant === "popover" ? "menu" : "dialog"}
        onClick={(e) => {
          e.stopPropagation();
          setStack([]);
          setOpen(!open);
        }}
      >
        {trigger ?? "⋯"}
      </button>

      {variant === "popover" ? (
        popoverPanel
      ) : (
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
      )}
    </div>
  );
}

export function PortalActionMenuList({
  items,
  onSelect,
  compact = false,
}: {
  items: PortalActionMenuItem[];
  onSelect: (item: PortalActionMenuItem) => void;
  /** Engere Zeilen für Popover. */
  compact?: boolean;
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
            role="menuitem"
            disabled={item.disabled}
            className={cn(
              "portal-text-body flex w-full items-center justify-between gap-2 text-left font-semibold",
              compact
                ? "rounded-none px-3.5 py-2.5 text-[14.5px]"
                : "rounded-[10px] px-3.5 py-3.5",
              item.disabled && "cursor-not-allowed opacity-45",
              item.danger
                ? "portal-danger hover:bg-[var(--p2-danger-soft)]"
                : "text-text-primary hover:bg-muted",
              item.disabled && !item.danger && "hover:bg-transparent"
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
