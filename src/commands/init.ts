import { join, resolve } from "node:path";
import { ensureGitRepo } from "../lib/git.ts";
import {
  emptyManifest,
  loadManifest,
  MANIFEST_NAME,
  saveManifest,
} from "../lib/manifest.ts";
import {
  pathExists,
  promptPath,
  readTextIfExists,
  writeFileIfAbsent,
  writeText,
} from "../lib/fs.ts";
import {
  ensureTenantScaffold,
  gitignoreSecretsSnippet,
  loadPreference,
  defaultPreference,
  type TenantPreference,
  OWNERSHIP_BUCKETS,
  RUNNERS,
  FORGES,
} from "../lib/tenant.ts";
import { canPrompt, askText, askChoice, askYesNo, askMulti } from "../lib/prompt.ts";
import { loadProfileFile, type InitProfile } from "../lib/profile.ts";
import { HARNESSES, KNOWN_MODULES, type CommandResult, type GlobalFlags, type ModuleName } from "../lib/types.ts";
import { cmdEnable } from "./enable.ts";
import { cmdSetup } from "./setup.ts";

const DEFAULT_MODULES: ModuleName[] = ["beads", "linear", "agents", "docs"];

function ownershipFromEnv(): TenantPreference["ownership"] | undefined {
  const env = process.env.HTS_OWNERSHIP;
  if (env === "factory" || env === "harris-product" || env === "client") return env;
  return undefined;
}

async function collectInteractive(flags: GlobalFlags): Promise<InitProfile> {
  console.log("HT Stack setup — answer to point this checkout.\n");

  const target = await askText("Target repo path", flags.cwd);
  const ownership = await askChoice(
    "Ownership bucket (who owns this repo / board / wiki)?",
    OWNERSHIP_BUCKETS,
    ownershipFromEnv() ?? "harris-product",
  );
  const harness = await askChoice("Agent harness (preference / BYO brain)?", HARNESSES, "cursor");
  const runner = await askChoice(
    "Runner mode? (cloud = their BYO cloud agent driver is OK)",
    RUNNERS,
    "local",
  );
  const forge = await askChoice(
    "Forge preference? (prototype implements github only)",
    FORGES,
    "github",
  );
  const model = await askText("Model hint for harness (empty = default)", "");
  const modules = (await askMulti(
    "Modules to enable now?",
    KNOWN_MODULES,
    DEFAULT_MODULES,
  )) as ModuleName[];
  const setup = await askYesNo(`Run hts setup ${harness} after init?`, true);

  return {
    target,
    preference: { ownership, harness, runner, forge, model },
    modules,
    setup,
  };
}

function collectHeadless(flags: GlobalFlags): InitProfile {
  if (flags.profile) {
    const profile = loadProfileFile(flags.profile);
    // Profile with no modules key → scaffold only; explicit list enables
    return profile;
  }
  return {
    target: flags.cwd,
    preference: {
      ownership: ownershipFromEnv() ?? "harris-product",
      harness: "cursor",
      runner: "local",
      forge: "github",
      model: "",
    },
    modules: [], // scaffold only unless interactive or profile lists modules
    setup: false,
  };
}

export async function cmdInit(flags: GlobalFlags, _args: string[]): Promise<CommandResult> {
  const interactive = canPrompt(flags);
  let plan: InitProfile;

  if (interactive) {
    const existingPref = loadPreference(flags.cwd);
    if (existingPref) {
      const rerun = await askYesNo(
        `Found existing .hts/config.yaml (${existingPref.ownership}/${existingPref.harness}). Re-run questionnaire?`,
        false,
      );
      plan = rerun
        ? await collectInteractive(flags)
        : {
            target: flags.cwd,
            preference: existingPref,
            modules: [],
            setup: false,
          };
    } else {
      plan = await collectInteractive(flags);
    }
  } else {
    plan = collectHeadless(flags);
  }

  const targetRoot = resolve(plan.target || flags.cwd);
  // Prefer working in the chosen target even if -C differed
  const effectiveFlags: GlobalFlags = { ...flags, cwd: targetRoot };

  const { root, created } = ensureGitRepo(targetRoot);
  const existing = loadManifest(root);
  const createdFiles: string[] = [];

  if (!existing) {
    createdFiles.push(saveManifest(root, emptyManifest()));
  }

  const preference = defaultPreference({
    ...loadPreference(root),
    ...plan.preference,
  });
  const forcePref = interactive || Boolean(flags.profile) || Boolean(ownershipFromEnv());
  const tenant = ensureTenantScaffold(root, preference, { forcePreference: forcePref });
  createdFiles.push(...tenant.created);

  const gitignore = join(root, ".gitignore");
  const ignoreSnippet = gitignoreSecretsSnippet();

  if (!pathExists(gitignore)) {
    writeFileIfAbsent(gitignore, `${ignoreSnippet}\n`);
    createdFiles.push(gitignore);
  } else {
    const cur = readTextIfExists(gitignore) || "";
    let next = cur;
    if (!cur.includes(".beads/config.local.yaml")) {
      next = next.endsWith("\n") ? `${next}\n${ignoreSnippet}\n` : `${next}\n\n${ignoreSnippet}\n`;
    } else if (cur.includes(".hts/") && !cur.includes(".hts/secrets.env")) {
      next = next
        .split("\n")
        .map((line) => (line.trim() === ".hts/" ? ".hts/secrets.env" : line))
        .join("\n");
      if (!next.includes(".hts/discovery/intake.md")) {
        next = next.endsWith("\n")
          ? `${next}.hts/discovery/intake.md\n`
          : `${next}\n.hts/discovery/intake.md\n`;
      }
    } else if (!cur.includes(".hts/secrets.env")) {
      next = next.endsWith("\n")
        ? `${next}\n.hts/secrets.env\n.hts/discovery/intake.md\n`
        : `${next}\n\n.hts/secrets.env\n.hts/discovery/intake.md\n`;
    }
    if (next !== cur) {
      writeText(gitignore, next);
      createdFiles.push(`${gitignore} (updated)`);
    }
  }

  const master = readTextIfExists(promptPath("master.md"));
  if (master) {
    const dest = join(root, ".hts", "prompts", "master.md");
    if (writeFileIfAbsent(dest, master) === "created") createdFiles.push(dest);
  }

  // Persist a reusable profile for next headless run
  const profileOut = join(root, ".hts", "profile.yaml");
  if (writeFileIfAbsent(
    profileOut,
    [
      `# Generated by hts init — safe to commit if it has no secrets`,
      `target: ${JSON.stringify(root)}`,
      `ownership: ${tenant.preference.ownership}`,
      `harness: ${tenant.preference.harness}`,
      `runner: ${tenant.preference.runner}`,
      `model: ${JSON.stringify(tenant.preference.model)}`,
      `forge: ${tenant.preference.forge}`,
      `setup: ${plan.setup ? "true" : "false"}`,
      `modules:`,
      ...(plan.modules.length ? plan.modules : DEFAULT_MODULES).map((m) => `  - ${m}`),
      "",
    ].join("\n"),
  ) === "created") {
    createdFiles.push(profileOut);
  }

  const followUps: string[] = [];
  if (plan.modules.length) {
    const enableResult = await cmdEnable(effectiveFlags, plan.modules);
    followUps.push(enableResult.message);
    if (enableResult.data && typeof enableResult.data === "object") {
      createdFiles.push(`enable: ${plan.modules.join(",")}`);
    }
  }

  if (plan.setup) {
    const setupResult = await cmdSetup(effectiveFlags, [tenant.preference.harness]);
    followUps.push(setupResult.message);
  }

  const hadManifest = Boolean(existing);
  const lines = [
    hadManifest
      ? `HT Stack ready in ${root} (${MANIFEST_NAME} present).`
      : `Initialized HT Stack in ${root}${created ? " (git init)" : ""}.`,
    `ownership=${tenant.preference.ownership} harness=${tenant.preference.harness} runner=${tenant.preference.runner}`,
    ...followUps,
    "",
    "Secrets checklist (values never committed):",
    "  - Linear/bd → .beads/config.local.yaml",
    "  - Notion/hts → .hts/secrets.env (see secrets.env.example) or cloud env",
  ];

  return {
    ok: true,
    command: "init",
    message: lines.filter(Boolean).join("\n"),
    data: {
      root,
      gitCreated: created,
      manifestCreated: !hadManifest,
      createdFiles,
      preference: tenant.preference,
      modules: plan.modules,
      setup: plan.setup,
      interactive,
      headless: flags.headless,
      profile: flags.profile ?? null,
    },
    next: [
      "Add secrets where they belong (see checklist above)",
      "hts doctor",
      "hts prime",
    ],
  };
}
