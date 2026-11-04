import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { findGitRoot } from "../lib/git.ts";
import { loadManifest, MANIFEST_NAME } from "../lib/manifest.ts";
import { pathExists, readTextIfExists } from "../lib/fs.ts";
import {
  checkSecrets,
  loadPreference,
  secretsPath,
  tenantConfigPath,
} from "../lib/tenant.ts";
import type { CommandResult, GlobalFlags } from "../lib/types.ts";

type Check = { id: string; ok: boolean; detail: string };

function hasCmd(cmd: string): boolean {
  const res = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return res.status === 0;
}

function gitignoresSecrets(root: string): boolean {
  const gi = readTextIfExists(join(root, ".gitignore")) || "";
  return gi.includes(".hts/secrets.env") || gi.includes(".hts/");
}

export async function cmdDoctor(flags: GlobalFlags, _args: string[]): Promise<CommandResult> {
  const root = findGitRoot(flags.cwd) || flags.cwd;
  const manifest = loadManifest(root);
  const preference = loadPreference(root);
  const checks: Check[] = [];

  checks.push({
    id: "git",
    ok: Boolean(findGitRoot(flags.cwd)),
    detail: findGitRoot(flags.cwd) ? `git root ${root}` : "not a git repo — run hts init",
  });

  checks.push({
    id: "manifest",
    ok: Boolean(manifest),
    detail: manifest ? `${MANIFEST_NAME} present` : `${MANIFEST_NAME} missing — run hts init`,
  });

  checks.push({
    id: "tenant_preference",
    ok: Boolean(preference),
    detail: preference
      ? `ownership=${preference.ownership} harness=${preference.harness} runner=${preference.runner} forge=${preference.forge}`
      : `${tenantConfigPath(root)} missing — run hts init`,
  });

  checks.push({
    id: "bun",
    ok: hasCmd("bun"),
    detail: hasCmd("bun") ? "bun available" : "bun missing (needed for source runs / build)",
  });

  const beadsPresent = pathExists(join(root, ".beads"));
  checks.push({
    id: "bd",
    ok: hasCmd("bd"),
    detail: hasCmd("bd")
      ? beadsPresent
        ? "bd available; .beads/ present"
        : "bd available; .beads/ missing (run bd init if using beads module)"
      : "bd not on PATH",
  });

  const enabled = Object.entries(manifest?.modules || {})
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k);

  checks.push({
    id: "modules",
    ok: true,
    detail: enabled.length ? `enabled: ${enabled.join(", ")}` : "no modules enabled yet",
  });

  const linearEnabled = Boolean(manifest?.modules?.linear?.enabled);
  const notionEnabled = Boolean(manifest?.modules?.notion?.enabled);
  const secretChecks = checkSecrets(root, { linearEnabled, notionEnabled });
  for (const s of secretChecks) {
    const ok = s.required ? s.present : true;
    checks.push({
      id: `secret:${s.id}`,
      ok,
      detail: `${s.detail} [${s.source}]`,
    });
  }

  const secretsFile = secretsPath(root);
  if (pathExists(secretsFile)) {
    checks.push({
      id: "secrets_gitignore",
      ok: gitignoresSecrets(root),
      detail: gitignoresSecrets(root)
        ? ".hts/secrets.env is gitignored"
        : "WARNING: .hts/secrets.env exists but may not be gitignored",
    });
  }

  if (preference?.forge && preference.forge !== "github") {
    checks.push({
      id: "forge_support",
      ok: true,
      detail: `forge preference=${preference.forge} (prototype implements github only)`,
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  const lines = checks.map((c) => `${c.ok ? "ok" : "!!"}  ${c.id}: ${c.detail}`);

  return {
    ok,
    command: "doctor",
    message: lines.join("\n"),
    data: {
      root,
      checks,
      enabledModules: enabled,
      preference,
      // never include secret values
      secrets: secretChecks.map((s) => ({
        id: s.id,
        required: s.required,
        present: s.present,
        source: s.source,
      })),
    },
    next: ok ? ["hts prime"] : ["hts init", "hts enable beads linear agents docs"],
  };
}
