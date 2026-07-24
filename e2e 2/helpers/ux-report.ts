import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

export type UxScreenRating = {
  screen: string;
  tc: string;
  u1: number;
  u2: number;
  u3: number;
  u4: number;
  u5: number;
  u6: number;
  u7: number;
  u8: number;
  befund: string[];
  fixVorschlag: string;
};

const reportDir = path.join(__dirname, "../reports");
const reportPath = path.join(reportDir, "ux-report.md");

export function initUxReport() {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    reportPath,
    `# UX-Bewertung E2E HV-Plattform\n\nGeneriert: ${new Date().toISOString()}\n\n| Screen | TC | U1 | U2 | U3 | U4 | U5 | U6 | U7 | U8 | Top-Befunde | Fix |\n|--------|-----|----|----|----|----|----|----|----|----|-------------|-----|\n`
  );
}

export function recordUxScreen(r: UxScreenRating) {
  mkdirSync(reportDir, { recursive: true });
  const top3 = r.befund.slice(0, 3).join("; ");
  const row = `| ${r.screen} | ${r.tc} | ${r.u1} | ${r.u2} | ${r.u3} | ${r.u4} | ${r.u5} | ${r.u6} | ${r.u7} | ${r.u8} | ${top3} | ${r.fixVorschlag} |\n`;
  appendFileSync(reportPath, row);
}

/** Platzhalter-Bewertung wenn Screen noch nicht manuell bewertet wurde. */
export function recordUxPlaceholder(screen: string, tc: string, note: string) {
  recordUxScreen({
    screen,
    tc,
    u1: 3,
    u2: 3,
    u3: 3,
    u4: 3,
    u5: 3,
    u6: 3,
    u7: 3,
    u8: 3,
    befund: [note, "Automatischer Platzhalter — manuelle UX-Review ausstehend"],
    fixVorschlag: "Nach Feature-Vervollständigung erneut bewerten",
  });
}
