export type SectionDividerVariant = "welle" | "baum" | "hugel" | "fels";

const PATHS: Record<SectionDividerVariant, string> = {
  welle:
    "M0,16 C360,32 1080,0 1440,16 L1440,32 L0,32 Z",
  baum:
    "M0,60 L0,40 C40,40 40,20 80,20 C120,20 120,35 160,30 C200,25 210,10 250,10 C290,10 300,25 340,20 C380,15 390,5 430,5 C470,5 480,20 520,18 C560,16 570,8 610,8 C650,8 660,22 700,20 C740,18 750,5 790,5 C830,5 840,18 880,15 C920,12 930,0 970,0 C1010,0 1020,15 1060,12 C1100,9 1110,20 1150,18 C1190,16 1200,5 1240,8 C1280,11 1290,25 1330,22 C1370,19 1390,35 1440,30 L1440,60 Z",
  hugel: "M0,48 L0,32 Q360,0 720,16 Q1080,32 1440,8 L1440,48 Z",
  fels:
    "M0,40 L0,20 L120,30 L240,10 L360,25 L480,5 L600,20 L720,8 L840,22 L960,12 L1080,28 L1200,6 L1320,18 L1440,15 L1440,40 Z",
};

function dividerHeight(variant: SectionDividerVariant): number {
  switch (variant) {
    case "baum":
      return 60;
    case "hugel":
      return 48;
    case "fels":
      return 40;
    default:
      return 32;
  }
}

export function SectionDivider({
  variant = "welle",
  from,
  to,
  flip = false,
}: {
  variant?: SectionDividerVariant;
  from: string;
  to: string;
  flip?: boolean;
}) {
  const height = dividerHeight(variant);
  const hellHellWelle = variant === "welle" && from === to;

  return (
    <div
      className="section-divider"
      aria-hidden="true"
      style={{
        background: from,
        lineHeight: 0,
        marginBottom: -1,
      }}
    >
      <svg
        viewBox={`0 0 1440 ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: `${height}px`,
          display: "block",
          transform: flip ? "scaleY(-1)" : "none",
        }}
      >
        <path
          d={PATHS[variant]}
          fill={hellHellWelle ? "#e8e6e0" : to}
          opacity={hellHellWelle ? 0.5 : 1}
        />
      </svg>
    </div>
  );
}
