/**
 * Portal: Auto-Dirty + globales beforeunload (analog CRM form-dirty).
 */
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

let dirtyHoldCount = 0;
let beforeUnloadBound = false;

function ensureBeforeUnloadListener() {
  if (beforeUnloadBound || typeof window === "undefined") return;
  beforeUnloadBound = true;
  window.addEventListener("beforeunload", (e) => {
    if (dirtyHoldCount <= 0) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

export function acquireGlobalDirtyHold(): () => void {
  ensureBeforeUnloadListener();
  dirtyHoldCount += 1;
  return () => {
    dirtyHoldCount = Math.max(0, dirtyHoldCount - 1);
  };
}

export function serializeFormFields(root: HTMLElement | null | undefined): string {
  if (!root) return "";
  const nodes = root.querySelectorAll(
    'input:not([type="hidden"]):not([data-dirty-ignore]), textarea:not([data-dirty-ignore]), select:not([data-dirty-ignore]), [contenteditable="true"]:not([data-dirty-ignore])'
  );
  const parts: string[] = [];
  nodes.forEach((node, i) => {
    const el = node as HTMLInputElement;
    if (el.readOnly && el.tagName === "INPUT") return;
    if (el.type === "file") {
      parts.push(`${i}:f:${el.files?.length ?? 0}`);
      return;
    }
    if (el.type === "checkbox" || el.type === "radio") {
      parts.push(`${i}:c:${el.checked ? 1 : 0}:${el.name}:${el.value}`);
      return;
    }
    if ((el as HTMLElement).isContentEditable) {
      parts.push(`${i}:e:${(el as HTMLElement).innerText ?? ""}`);
      return;
    }
    parts.push(`${i}:v:${el.value ?? ""}`);
  });
  return parts.join("\n");
}

export function useAutoFormDirty(
  rootRef: RefObject<HTMLElement | null>,
  open: boolean,
  dirtyOverride?: boolean
): boolean {
  const [autoDirty, setAutoDirty] = useState(false);
  const snapshotRef = useRef("");

  useEffect(() => {
    if (!open) {
      setAutoDirty(false);
      snapshotRef.current = "";
      return;
    }
    let cancelled = false;
    const capture = () => {
      if (cancelled) return;
      snapshotRef.current = serializeFormFields(rootRef.current);
      setAutoDirty(false);
    };
    const t0 = window.setTimeout(capture, 0);
    const t1 = window.setTimeout(capture, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [open, rootRef]);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;
    const recompute = () => {
      const now = serializeFormFields(root);
      if (!snapshotRef.current) {
        snapshotRef.current = now;
        setAutoDirty(false);
        return;
      }
      setAutoDirty(now !== snapshotRef.current);
    };
    root.addEventListener("input", recompute, true);
    root.addEventListener("change", recompute, true);
    return () => {
      root.removeEventListener("input", recompute, true);
      root.removeEventListener("change", recompute, true);
    };
  }, [open, rootRef]);

  useEffect(() => {
    if (dirtyOverride !== undefined) return;
    if (!open || !autoDirty) return;
    return acquireGlobalDirtyHold();
  }, [open, autoDirty, dirtyOverride]);

  useEffect(() => {
    if (dirtyOverride !== true || !open) return;
    return acquireGlobalDirtyHold();
  }, [open, dirtyOverride]);

  if (dirtyOverride !== undefined) return dirtyOverride;
  return autoDirty;
}
