import { readTextIfExists, pathExists } from "./fs.ts";
import type { HarnessName, ModuleName } from "./types.ts";
import { HARNESSES, KNOWN_MODULES } from "./types.ts";
import {
  defaultPreference,
  type ForgeName,
  type OwnershipBucket,
  type RunnerMode,
  type TenantPreference,
  OWNERSHIP_BUCKETS,
  RUNNERS,
  FORGES,
} from "./tenant.ts";

export type InitProfile = {
  target?: string;
  preference: Partial<TenantPreference>;
  modules: ModuleName[];
  setup: boolean;
};

/** Minimal YAML-ish profile for --headless -f */
export function parseProfile(raw: string): InitProfile {
  const preference = defaultPreference();
  const modules: ModuleName[] = [];
  let target: string | undefined;
  let setup = true;

  const targetM = /(?:^|\n)target:\s*(.+)/.exec(raw);
  if (targetM) target = targetM[1].replace(/['"]/g, "").trim();

  const ownership = /(?:^|\n)ownership:\s*([a-z-]+)/.exec(raw);
  if (ownership && (OWNERSHIP_BUCKETS as readonly string[]).includes(ownership[1])) {
    preference.ownership = ownership[1] as OwnershipBucket;
  }
  const harness = /(?:^|\n)harness:\s*([a-z0-9-]+)/.exec(raw);
  if (harness && (HARNESSES as readonly string[]).includes(harness[1])) {
    preference.harness = harness[1] as HarnessName;
  }
  const runner = /(?:^|\n)runner:\s*([a-z]+)/.exec(raw);
  if (runner && (RUNNERS as readonly string[]).includes(runner[1])) {
    preference.runner = runner[1] as RunnerMode;
  }
  const model = /(?:^|\n)model:\s*"([^"]*)"/.exec(raw);
  if (model) preference.model = model[1];
  const forge = /(?:^|\n)forge:\s*([a-z]+)/.exec(raw);
  if (forge && (FORGES as readonly string[]).includes(forge[1])) {
    preference.forge = forge[1] as ForgeName;
  }
  const setupM = /(?:^|\n)setup:\s*(true|false)/.exec(raw);
  if (setupM) setup = setupM[1] === "true";

  const modBlock = /(?:^|\n)modules:\s*\n((?:\s*-\s*.+\n?)*)/.exec(raw);
  if (modBlock) {
    for (const line of modBlock[1].split("\n")) {
      const m = /^\s*-\s*([a-z]+)/.exec(line);
      if (m && (KNOWN_MODULES as readonly string[]).includes(m[1])) {
        modules.push(m[1] as ModuleName);
      }
    }
  }

  return {
    target,
    preference,
    // Empty modules in profile means "scaffold only" unless profile listed some
    modules,
    setup,
  };
}

export function loadProfileFile(path: string): InitProfile {
  if (!pathExists(path)) throw new Error(`Profile not found: ${path}`);
  return parseProfile(readTextIfExists(path) || "");
}
