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
              marginBottom: "20px",
              display: "flex",
              justifyContent: "center",
              color: "#6B6560",
            }}
            aria-hidden
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
