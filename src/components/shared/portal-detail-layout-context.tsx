"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Footer aus `PortalDetailLayout` — Desktop: automatisch in `PortalDetailHead`. */
export const PortalDetailLayoutFooterContext = createContext<ReactNode>(null);

export function usePortalDetailLayoutFooter(): ReactNode {
  return useContext(PortalDetailLayoutFooterContext);
}
