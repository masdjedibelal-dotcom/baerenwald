import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const cachePath = path.join(__dirname, "../.cache/tc01-state.json");

export type Tc01State = {
  leadId: string;
  statusToken: string;
  auftragId?: string;
  nachtragId?: string;
};

export function saveTc01State(state: Tc01State) {
  mkdirSync(path.dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(state, null, 2));
}

export function loadTc01State(): Tc01State | null {
  if (!existsSync(cachePath)) return null;
  return JSON.parse(readFileSync(cachePath, "utf8")) as Tc01State;
}
