import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1A3D2B",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          Bärenwald München
        </div>
        <div
          style={{
            fontSize: "30px",
            color: "rgba(255,255,255,0.65)",
            textAlign: "center",
            fontWeight: 400,
            marginTop: "8px",
          }}
        >
          Handwerker aus einer Hand
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "#A8D4B8",
            textAlign: "center",
            marginTop: "16px",
            letterSpacing: "0.02em",
          }}
        >
          München &amp; Umgebung · Seit 2020
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
