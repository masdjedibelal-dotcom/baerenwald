"use client";

import { Toaster } from "sonner";

export function PortalToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border-default bg-surface-card text-text-primary shadow-lg",
          title: "font-semibold text-sm",
          description: "text-xs text-text-secondary",
          success: "border-emerald-200",
          error: "border-red-200",
        },
      }}
    />
  );
}
