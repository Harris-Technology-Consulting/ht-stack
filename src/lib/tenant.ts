import { join } from "node:path";
import {
  pathExists,
  readTextIfExists,
  writeFileIfAbsent,
  writeText,
  ensureDir,
} from "./fs.ts";
import type { HarnessName } from "./types.ts";
import { HARNESSES } from "./types.ts";

export const OWNERSHIP_BUCKETS = ["factory", "harris-product", "client"] as const;
export type OwnershipBucket = (typeof OWNERSHIP_BUCKETS)[number];

export const RUNNERS = ["local", "cloud"] as const;
export type RunnerMode = (typeof RUNNERS)[number];

export const FORGES = ["github", "gitlab", "bitbucket"] as const;
export type ForgeName = (typeof FORGES)[number];

/** Preference layer — never silently overridden by hts upgrades. */
export type TenantPreference = {
  version: 1;
  ownership: OwnershipBucket;
  harness: HarnessName;
  runner: RunnerMode;
  /** Optional model hint for the harness; empty = harness default. */
  model: string;
  forge: ForgeName;
  /** Display / docs only in v1 — GitHub is the only implemented forge. */
  forgeNote?: string;
};

export type SecretCheck = {
  id: string;
  required: boolean;
  present: boolean;
  source: string;
  detail: string;
};

export function defaultPreference(partial?: Partial<TenantPreference>): TenantPreference {
  return {
    version: 1,
    ownership: "harris-product",
    harness: "cursor",
    runner: "local",
    model: "",
    forge: "github",
    forgeNote: "Prototype implements GitHub only; gitlab/bitbucket are reserved preference values.",
    ...partial,
  };
}

export function htsDir(root: string): string {
  return join(root, ".hts");
}

export function tenantConfigPath(root: string): string {
  return join(htsDir(root), "config.yaml");
}

export function secretsPath(root: string): string {
  return join(htsDir(root), "secrets.env");
}

export function secretsExamplePath(root: string): string {
  return join(htsDir(root), "secrets.env.example");
}

export function serializePreference(p: TenantPreference): string {
  const lines = [
    `# HT Stack tenant preference (not secrets)`,
    `# Opinionated layout/prompts live elsewhere; do not put API keys here.`,
    `version: ${p.version}`,
    `ownership: ${p.ownership}  # factory | harris-product | client`,
    `harness: ${p.harness}  # ${HARNESSES.join(" | ")}`,
    `runner: ${p.runner}  # local | cloud (BYO cloud driver OK)`,
    `model: ${JSON.stringify(p.model)}  # empty = harness default`,
    `forge: ${p.forge}  # github implemented; others preference-only for now`,
  ];
  if (p.forgeNote) lines.push(`forgeNote: ${JSON.stringify(p.forgeNote)}`);
  lines.push("");
  return lines.join("\n");
}

export function parsePreference(raw: string): TenantPreference {
  const base = defaultPreference();
  const ownership = /(?:^|\n)ownership:\s*([a-z-]+)/.exec(raw);
  if (ownership && (OWNERSHIP_BUCKETS as readonly string[]).includes(ownership[1])) {
    base.ownership = ownership[1] as OwnershipBucket;
  }
  const harness = /(?:^|\n)harness:\s*([a-z0-9-]+)/.exec(raw);
  if (harness && (HARNESSES as readonly string[]).includes(harness[1])) {
    base.harness = harness[1] as HarnessName;
  }
  const runner = /(?:^|\n)runner:\s*([a-z]+)/.exec(raw);
  if (runner && (RUNNERS as readonly string[]).includes(runner[1])) {
    base.runner = runner[1] as RunnerMode;
  }
  const model = /(?:^|\n)model:\s*"([^"]*)"/.exec(raw);
  if (model) base.model = model[1];
  const forge = /(?:^|\n)forge:\s*([a-z]+)/.exec(raw);
  if (forge && (FORGES as readonly string[]).includes(forge[1])) {
    base.forge = forge[1] as ForgeName;
  }
  const forgeNote = /(?:^|\n)forgeNote:\s*"([^"]*)"/.exec(raw);
  if (forgeNote) base.forgeNote = forgeNote[1];
  return base;
}

export function loadPreference(root: string): TenantPreference | null {
  const path = tenantConfigPath(root);
  if (!pathExists(path)) return null;
  return parsePreference(readTextIfExists(path) || "");
}

export function secretsExampleBody(): string {
  return [
    "# HT Stack secrets — copy to secrets.env (gitignored). Never commit real values.",
    "# Cloud runners: set the same keys in the harness/Cloud env instead of (or in addition to) this file.",
    "",
    "# Notion (when notion module enabled)",
    "# NOTION_API_KEY=",
    "",
    "# Optional GitHub token if agent cannot use gh auth",
    "# GITHUB_TOKEN=",
    "",
    "# Linear for HT Stack helpers (bd still prefers .beads/config.local.yaml)",
    "# LINEAR_API_KEY=",
    "",
  ].join("\n");
}

/** Write preference. By default does not overwrite tenant-owned config unless `force`. */
export function savePreference(root: string, preference: TenantPreference, force = false): "created" | "updated" | "kept" {
  ensureDir(htsDir(root));
  const path = tenantConfigPath(root);
  if (pathExists(path) && !force) return "kept";
  const existed = pathExists(path);
  writeText(path, serializePreference(preference));
  return existed ? "updated" : "created";
}

/** Ensure preference + secret example exist. Never overwrites preference unless force. */
export function ensureTenantScaffold(
  root: string,
  partial?: Partial<TenantPreference>,
  opts?: { forcePreference?: boolean },
): { created: string[]; preference: TenantPreference } {
  ensureDir(htsDir(root));
  const created: string[] = [];
  const existing = loadPreference(root);
  const preference = opts?.forcePreference
    ? defaultPreference({ ...existing, ...partial })
    : existing ?? defaultPreference(partial);

  const prefStatus = savePreference(root, preference, Boolean(opts?.forcePreference));
  if (prefStatus === "created") created.push(tenantConfigPath(root));
  if (prefStatus === "updated") created.push(`${tenantConfigPath(root)} (updated)`);

  if (writeFileIfAbsent(secretsExamplePath(root), secretsExampleBody()) === "created") {
    created.push(secretsExamplePath(root));
  }

  return { created, preference };
}

function parseEnvKeys(raw: string): Set<string> {
  const keys = new Set<string>();
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = /^([A-Z0-9_]+)=/.exec(t);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function envHas(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.length > 0;
}

function beadsLinearConfigured(root: string): boolean {
  const local = readTextIfExists(join(root, ".beads", "config.local.yaml")) || "";
  if (/api_key\s*:/.test(local) && !/api_key\s*:\s*['"]?\s*$/.test(local)) return true;
  // common env fallbacks — presence only
  return envHas("LINEAR_API_KEY") || envHas("BD_LINEAR_API_KEY");
}

/**
 * Presence checks only — never returns secret values.
 */
export function checkSecrets(
  root: string,
  opts: { linearEnabled: boolean; notionEnabled: boolean },
): SecretCheck[] {
  const checks: SecretCheck[] = [];
  const secretsFile = secretsPath(root);
  const fileKeys = pathExists(secretsFile)
    ? parseEnvKeys(readTextIfExists(secretsFile) || "")
    : new Set<string>();

  const hasNotion =
    fileKeys.has("NOTION_API_KEY") || envHas("NOTION_API_KEY") || envHas("NOTION_TOKEN");
  checks.push({
    id: "notion_api_key",
    required: opts.notionEnabled,
    present: hasNotion,
    source: ".hts/secrets.env or env",
    detail: opts.notionEnabled
      ? hasNotion
        ? "Notion API key present"
        : "Notion enabled but NOTION_API_KEY missing"
      : hasNotion
        ? "Notion key present (module not enabled)"
        : "Notion key not required",
  });

  const linearOk = beadsLinearConfigured(root) || fileKeys.has("LINEAR_API_KEY") || envHas("LINEAR_API_KEY");
  checks.push({
    id: "linear_api_key",
    required: opts.linearEnabled,
    present: linearOk,
    source: ".beads/config.local.yaml (preferred) or env / .hts/secrets.env",
    detail: opts.linearEnabled
      ? linearOk
        ? "Linear credentials present"
        : "Linear enabled but no local/env key detected"
      : linearOk
        ? "Linear credentials present (module not enabled)"
        : "Linear key not required",
  });

  checks.push({
    id: "hts_secrets_file",
    required: false,
    present: pathExists(secretsFile),
    source: ".hts/secrets.env",
    detail: pathExists(secretsFile)
      ? "secrets.env present (values not shown)"
      : "secrets.env absent — OK if using env/cloud only; see secrets.env.example",
  });

  return checks;
}

export function gitignoreSecretsSnippet(): string {
  return [
    "# HT Stack / local secrets",
    ".beads/config.local.yaml",
    ".beads/.env",
    ".hts/secrets.env",
    ".hts/discovery/intake.md",
  ].join("\n");
}
