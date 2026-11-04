import { readTextIfExists, promptPath } from "../lib/fs.ts";
import { findGitRoot } from "../lib/git.ts";
import { loadManifest, MANIFEST_NAME } from "../lib/manifest.ts";
import { loadPreference } from "../lib/tenant.ts";
import type { CommandResult, GlobalFlags } from "../lib/types.ts";

export async function cmdPrime(flags: GlobalFlags, _args: string[]): Promise<CommandResult> {
  const root = findGitRoot(flags.cwd) || flags.cwd;
  const manifest = loadManifest(root);
  const preference = loadPreference(root);
  const master =
    readTextIfExists(promptPath("master.md")) ||
    "HT Stack master prompt missing from factory install.";

  const enabled = Object.entries(manifest?.modules || {})
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k);

  const prefBlock = preference
    ? [
        "## Preference (tenant-owned — do not silently override)",
        `- ownership: ${preference.ownership}`,
        `- harness: ${preference.harness}`,
        `- runner: ${preference.runner}`,
        `- model: ${preference.model || "(harness default)"}`,
        `- forge: ${preference.forge}`,
        preference.forgeNote ? `- forgeNote: ${preference.forgeNote}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "## Preference\n- missing — run `hts init` (writes `.hts/config.yaml`)";

  const context = [
    "# HT Stack agent context (hts prime)",
    "",
    `Target root: ${root}`,
    `Manifest: ${manifest ? MANIFEST_NAME : "missing — run hts init"}`,
    `Enabled modules: ${enabled.length ? enabled.join(", ") : "(none)"}`,
    `Headless: ${flags.headless}`,
    "",
    prefBlock,
    "",
    "## Opinionated (HT Stack)",
    "- Use `hts` and `bd` CLIs; do not invent parallel trackers",
    "- Secrets live with the consumer: Linear → `.beads/config.local.yaml`; Notion/hts → `.hts/secrets.env` or cloud env",
    "- Never commit secrets or workspace IDs",
    "- Do not vendor ht-stack into client apps",
    "- PRs via tenant git/gh auth by default; GitHub App is optional",
    "- Ownership buckets: factory | harris-product | client",
    "",
    "## Master prompt",
    master.trim(),
    "",
  ].join("\n");

  if (!flags.json) {
    console.log(context);
    return {
      ok: true,
      command: "prime",
      message: "(printed)",
      data: { root, enabledModules: enabled, preference, chars: context.length },
    };
  }

  return {
    ok: true,
    command: "prime",
    message: "HT Stack context ready",
    data: { root, enabledModules: enabled, preference, context },
  };
}
