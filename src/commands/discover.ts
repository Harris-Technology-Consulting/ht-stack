import { join } from "node:path";
import { findGitRoot } from "../lib/git.ts";
import { promptPath, readTextIfExists, writeText, ensureDir } from "../lib/fs.ts";
import type { CommandResult, GlobalFlags } from "../lib/types.ts";

export async function cmdDiscover(flags: GlobalFlags, _args: string[]): Promise<CommandResult> {
  const root = findGitRoot(flags.cwd) || flags.cwd;
  const discovery =
    readTextIfExists(promptPath("discovery.md")) ||
    "Discovery prompt missing from factory install.";

  const outDir = join(root, ".hts", "discovery");
  ensureDir(outDir);
  const promptFile = join(outDir, "prompt.md");
  writeText(promptFile, discovery);

  const starter = join(outDir, "intake.md");
  writeText(
    starter,
    [
      "# Discovery intake",
      "",
      "Fill with the business. Agents: use prompts/discovery.md + this file; do not invent secrets.",
      "",
      "## Org",
      "",
      "- Name:",
      "- Operator email:",
      "- Primary systems in scope:",
      "",
      "## Pain / opportunity",
      "",
      "1.",
      "2.",
      "3.",
      "",
      "## Constraints",
      "",
      "- Repo access:",
      "- Compliance / MNPI:",
      "- Must-keep tools:",
      "",
      "## Desired modules",
      "",
      "- [ ] beads",
      "- [ ] linear",
      "- [ ] agents",
      "- [ ] docs",
      "",
    ].join("\n"),
  );

  const message = flags.headless
    ? `Wrote discovery scaffold to ${outDir} (headless — no interactive questions).`
    : [
        "Discovery-first mode scaffolded.",
        "",
        `Prompt: ${promptFile}`,
        `Intake:  ${starter}`,
        "",
        "Interview the business against the intake, then:",
        "  hts init && hts enable <modules>",
        "Seed tickets from the answers (bd create / Linear) — do not skip intake.",
      ].join("\n");

  return {
    ok: true,
    command: "discover",
    message,
    data: { root, promptFile, starter, headless: flags.headless, profile: flags.profile ?? null },
    next: ["Edit .hts/discovery/intake.md", "hts init", "hts enable beads linear agents docs"],
  };
}
