import { readFileSync } from "fs";
import path from "path";

import type { E2ETestContext } from "../global-setup";

export function loadE2EContext(): E2ETestContext {
  const raw = readFileSync(
    path.join(__dirname, "..", ".cache/test-context.json"),
    "utf8"
  );
  return JSON.parse(raw) as E2ETestContext;
}

export function uniqueMelderEmail(): string {
  return `e2e-melder+${Date.now()}@example.com`;
}
