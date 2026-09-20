"use client";
import { PALETTE } from "@/lib/tokens/palette";
import { PortalIcon } from "@/components/portal/PortalIcon";

import { Component, type ReactNode } from "react";

import { SITE_CONFIG } from "@/lib/config";

interface State {
  hasError: boolean;
  error?: Error;
}

interface Props {
  children: ReactNode;
}

export class FunnelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Funnel Error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: 480,
            margin: "5rem auto",
            padding: "0 1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              justifyContent: "center",
              color: "var(--fl-faint)",
            }}
            aria-hidden
          >
            <PortalIcon n="alert-triangle" ctx="default" size={40} />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 12,
              color: "var(--fl-ink)",
            }}
          >
            Kurze Unterbrechung
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--fl-faint)",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Etwas ist schiefgelaufen. Rufen Sie uns einfach direkt an — wir helfen
            sofort weiter.
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--fl-accent)",
              color: "white",
              borderRadius: 999,
              padding: "0.75rem 1.5rem",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Jetzt anrufen →
          </a>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "none",
                border: "none",
                fontSize: 13,
                color: PALETTE.h9e9890,
                cursor: "pointer",
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
