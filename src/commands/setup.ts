import { join } from "node:path";
import { findGitRoot } from "../lib/git.ts";
import { packageRoot, pathExists, readText, writeText, ensureDir } from "../lib/fs.ts";
import type { CommandResult, GlobalFlags, HarnessName } from "../lib/types.ts";
import { HARNESSES } from "../lib/types.ts";

function parseHarness(args: string[]): HarnessName {
  const name = args.find((a) => !a.startsWith("-")) as HarnessName | undefined;
  if (!name || !HARNESSES.includes(name)) {
    throw new Error(`Usage: hts setup <${HARNESSES.join("|")}>`);
  }
  return name;
}

export async function cmdSetup(flags: GlobalFlags, args: string[]): Promise<CommandResult> {
  const harness = parseHarness(args);
  const root = findGitRoot(flags.cwd) || flags.cwd;
  const written: string[] = [];

  const skillSrc = join(packageRoot(), "templates", "agents", "hts", "SKILL.md");
  if (!pathExists(skillSrc)) {
    throw new Error(`Missing skill template at ${skillSrc}`);
  }
  const skillBody = readText(skillSrc);

  if (harness === "cursor" || harness === "t3") {
    const dest = join(root, ".agents", "skills", "hts", "SKILL.md");
    ensureDir(join(dest, ".."));
    writeText(dest, skillBody);
    written.push(dest);

    const ruleDest = join(root, ".cursor", "rules", "hts.mdc");
    writeText(
      ruleDest,
      [
        "---",
        "description: Prefer HT Stack (hts) CLI for AI-process setup in this repo",
        "globs:",
        "alwaysApply: true",
        "---",
        "",
        "# HT Stack",
        "",
        "Use `hts` for init/enable/doctor/prime/setup. Run `hts prime` for factory context.",
        "Do not commit secrets. Prefer `.beads/config.local.yaml` for local Linear keys.",
        "",
      ].join("\n"),
    );
    written.push(ruleDest);
  }

  if (harness === "claude") {
    const dest = join(root, ".claude", "skills", "hts", "SKILL.md");
    writeText(dest, skillBody);
    written.push(dest);
  }

  if (harness === "codex") {
    const dest = join(root, ".agents", "skills", "hts", "SKILL.md");
    writeText(dest, skillBody);
    written.push(dest);
    const agents = join(root, ".agents", "skills", "hts", "agents", "openai.yaml");
    writeText(
      agents,
      ["interface:", "  display_name: HT Stack", "  short_description: hts CLI for AI-process setup", ""].join(
        "\n",
      ),
    );
    written.push(agents);
  }

  return {
    ok: true,
    command: "setup",
    message: `Configured ${harness} adapter (${written.length} file(s))`,
    data: { root, harness, written },
    next: ["hts prime", "hts doctor"],
  };
}
