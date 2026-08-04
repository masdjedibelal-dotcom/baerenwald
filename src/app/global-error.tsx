"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f6f3",
          color: "#1e1c1a",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "1.5rem" }}>Etwas ist schiefgelaufen</h1>
        <p style={{ margin: "0 0 24px", color: "#524e4a", maxWidth: 400 }}>
          {process.env.NODE_ENV === "development" ? error.message : "Bitte Seite neu laden."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "none",
            background: "#2e7d52",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
