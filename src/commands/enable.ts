import { join } from "node:path";
import { findGitRoot } from "../lib/git.ts";
import {
  emptyManifest,
  enableModules,
  loadManifest,
  saveManifest,
} from "../lib/manifest.ts";
import { pathExists, writeFileIfAbsent, writeText, packageRoot, readText } from "../lib/fs.ts";
import type { CommandResult, GlobalFlags, ModuleName } from "../lib/types.ts";
import { KNOWN_MODULES, PLANNED_MODULES } from "../lib/types.ts";

function parseModules(args: string[]): ModuleName[] {
  const mods = args.filter((a) => !a.startsWith("-")) as ModuleName[];
  for (const m of mods) {
    if (!KNOWN_MODULES.includes(m)) {
      throw new Error(`Unknown module '${m}'. Known: ${KNOWN_MODULES.join(", ")}`);
    }
  }
  if (mods.length === 0) {
    throw new Error(`Specify modules: ${KNOWN_MODULES.join(" ")}`);
  }
  return mods;
}

function enableBeads(root: string): string[] {
  const notes: string[] = [];
  // Prefer existing bd; we only scaffold ignore/local secret guidance.
  if (!pathExists(join(root, ".beads"))) {
    notes.push("beads: .beads/ not found — run `bd init` in this repo (hts does not vendor bd).");
    writeFileIfAbsent(
      join(root, ".hts", "examples", "beads.config.local.yaml.example"),
      [
        "# After `bd init`, copy to .beads/config.local.yaml (gitignored)",
        "# linear:",
        "#   api_key: lin_api_...",
        "",
      ].join("\n"),
    );
  } else {
    notes.push("beads: .beads/ present");
    writeFileIfAbsent(
      join(root, ".beads", "config.local.yaml.example"),
      [
        "# Copy to config.local.yaml (gitignored) for local secrets",
        "# linear:",
        "#   api_key: lin_api_...",
        "",
      ].join("\n"),
    );
  }
  return notes;
}

function enableAgents(root: string): string[] {
  const skillSrc = join(packageRoot(), "templates", "agents", "hts", "SKILL.md");
  const destDir = join(root, ".agents", "skills", "hts");
  const dest = join(destDir, "SKILL.md");
  if (pathExists(skillSrc)) {
    writeText(dest, readText(skillSrc));
    return [`agents: wrote ${dest}`];
  }
  return ["agents: template missing in factory — skipped skill install"];
}

function enableDocs(root: string): string[] {
  const dest = join(root, "docs", "ht-stack.md");
  const status = writeFileIfAbsent(
    dest,
    [
      "# HT Stack notes",
      "",
      "This project is managed with `hts` (HT Stack).",
      "",
      "- Manifest: `hts.stack.yaml`",
      "- Local prompts: `.hts/prompts/`",
      "- Prefer `hts` / `bd` CLIs over inventing parallel trackers",
      "",
    ].join("\n"),
  );
  return status === "created" ? [`docs: created ${dest}`] : [`docs: ${dest} already present`];
}

function enableLinear(_root: string): string[] {
  return [
    "linear: enable via beads (`bd config` / `.beads/config.local.yaml`) — hts will not write API keys to git",
  ];
}

export async function cmdEnable(flags: GlobalFlags, args: string[]): Promise<CommandResult> {
  const modules = parseModules(args);
  const root = findGitRoot(flags.cwd) || flags.cwd;
  let manifest = loadManifest(root) || emptyManifest();
  const actions: string[] = [];
  const planned: string[] = [];

  for (const mod of modules) {
    if (PLANNED_MODULES.has(mod)) {
      planned.push(mod);
      manifest = enableModules(manifest, [mod], "planned — stub enabled in manifest only");
      actions.push(`${mod}: marked enabled (planned module; no scaffold yet)`);
      continue;
    }
    switch (mod) {
      case "beads":
        actions.push(...enableBeads(root));
        break;
      case "agents":
        actions.push(...enableAgents(root));
        break;
      case "docs":
        actions.push(...enableDocs(root));
        break;
      case "linear":
        actions.push(...enableLinear(root));
        break;
    }
    manifest = enableModules(manifest, [mod]);
  }

  const path = saveManifest(root, manifest);
  return {
    ok: true,
    command: "enable",
    message: `Enabled: ${modules.join(", ")}`,
    data: { root, modules, actions, planned, manifest: path },
    next: planned.length
      ? [`Planned modules (${planned.join(", ")}) are stubs — see README Modules table`, `hts doctor`]
      : [`hts doctor`, `hts prime`],
  };
}
