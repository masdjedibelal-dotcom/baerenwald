import type { ResolveVorgangInput } from "@/lib/crm-vorgang/types";

import sharedFixtures from "../../../shared/crm-vorgang/resolve-vorgang.fixtures.json";

export type ResolveVorgangFixtureExpect = {
  phase: string;
  unterstatus: string;
  needsAction: boolean;
  actor: string | null;
  notfall?: boolean;
  wartet_freigabe?: boolean;
  ueberfaellig?: boolean;
};

export type ResolveVorgangFixture = {
  id: string;
  input: ResolveVorgangInput;
  expect: ResolveVorgangFixtureExpect;
};

/** Kanonische Fälle — geladen aus shared/crm-vorgang/resolve-vorgang.fixtures.json */
export const RESOLVE_VORGANG_FIXTURES: ResolveVorgangFixture[] = (
  sharedFixtures as { fixtures: ResolveVorgangFixture[] }
).fixtures;

export const RESOLVE_VORGANG_FIXTURES_VERSION = (
  sharedFixtures as { version: string }
).version;
