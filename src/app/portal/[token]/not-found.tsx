export default function PortalNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f6f3",
        padding: 24,
        textAlign: "center",
      }}
    >
      <img
        src="https://baerenwaldmuenchen.de/logo-mark-green.png"
        width="60"
        style={{ marginBottom: 24 }}
        alt="Bärenwald Logo"
      />
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1A3D2B",
          marginBottom: 12,
        }}
      >
        Portal nicht gefunden
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#6B7280",
          maxWidth: 320,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Der Link ist ungültig oder abgelaufen. Bitte wende dich direkt an uns.
      </p>
      <a
        href="tel:+4989809557226"
        style={{
          background: "#2E7D52",
          color: "white",
          padding: "12px 24px",
          borderRadius: 999,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Jetzt anrufen
      </a>
    </div>
  );
}
