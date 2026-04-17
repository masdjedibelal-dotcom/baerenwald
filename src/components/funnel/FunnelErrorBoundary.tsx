"use client";

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
            maxWidth: "480px",
            margin: "80px auto",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              marginBottom: "20px",
            }}
            aria-hidden
          >
            🔧
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              marginBottom: "12px",
              color: "#1E1C1A",
            }}
          >
            Kurze Unterbrechung
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#6B6560",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            Etwas ist schiefgelaufen. Ruf uns einfach direkt an — wir helfen
            sofort weiter.
          </p>
          <a
            href={SITE_CONFIG.phoneHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#2E7D52",
              color: "white",
              borderRadius: "999px",
              padding: "12px 24px",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Jetzt anrufen →
          </a>
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "none",
                border: "none",
                fontSize: "13px",
                color: "#9E9890",
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
