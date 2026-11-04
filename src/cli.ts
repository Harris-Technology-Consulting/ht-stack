#!/usr/bin/env bun
import { resolve } from "node:path";
import { cmdInit } from "./commands/init.ts";
import { cmdEnable } from "./commands/enable.ts";
import { cmdDoctor } from "./commands/doctor.ts";
import { cmdPrime } from "./commands/prime.ts";
import { cmdSetup } from "./commands/setup.ts";
import { cmdDiscover } from "./commands/discover.ts";
import { emit, fail } from "./lib/output.ts";
import type { GlobalFlags } from "./lib/types.ts";

const VERSION = "0.1.0";

const HELP = `hts — HT Stack CLI v${VERSION}

Usage:
  hts <command> [args] [flags]

Commands:
  init                 Interactive setup (path, ownership, harness, modules); --headless skips prompts
  enable <modules...>  Turn modules on (idempotent)
  discover             Discovery-first intake scaffold
  doctor               Healthcheck
  prime                Print factory context for agents
  setup <harness>      Install agent adapter (cursor|claude|codex|t3)
  version              Print version
  help                 Show help

Flags:
  --json               Machine-readable output
  --headless           Non-interactive (no TTY assumptions)
  -C, --cwd <path>     Working directory
  -f, --profile <file> Profile path for headless runs
  -h, --help           Show help

Examples:
  hts init                    # asks where/whose/brain/modules, then enable+setup
  hts init --headless         # scaffold only with defaults
  hts init --headless -f .hts/profile.yaml
  hts doctor --json
`;

function parseGlobal(argv: string[]): { flags: GlobalFlags; command?: string; args: string[] } {
  const flags: GlobalFlags = {
    json: false,
    headless: false,
    help: false,
    cwd: process.cwd(),
  };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--json") flags.json = true;
    else if (a === "--headless") flags.headless = true;
    else if (a === "-h" || a === "--help") flags.help = true;
    else if (a === "-C" || a === "--cwd") {
      const v = argv[++i];
      if (!v) throw new Error(`${a} requires a path`);
      flags.cwd = resolve(v);
    } else if (a === "-f" || a === "--profile") {
      const v = argv[++i];
      if (!v) throw new Error(`${a} requires a file`);
      flags.profile = resolve(flags.cwd, v);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }

  const [command, ...args] = positional;
  return { flags, command, args };
}

async function main(): Promise<void> {
  let flags: GlobalFlags;
  let command: string | undefined;
  let args: string[];
  try {
    ({ flags, command, args } = parseGlobal(process.argv.slice(2)));
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(2);
    return;
  }

  if (flags.help || !command || command === "help") {
    if (flags.json) {
      emit(flags, { ok: true, command: "help", message: HELP, data: { version: VERSION } });
    } else {
      console.log(HELP);
    }
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    emit(flags, { ok: true, command: "version", message: VERSION, data: { version: VERSION } });
    return;
  }

  try {
    switch (command) {
      case "init":
        emit(flags, await cmdInit(flags, args));
        break;
      case "enable":
        emit(flags, await cmdEnable(flags, args));
        break;
      case "doctor":
        emit(flags, await cmdDoctor(flags, args));
        break;
      case "prime": {
        const result = await cmdPrime(flags, args);
        if (flags.json) emit(flags, result);
        // text mode already printed by cmdPrime
        break;
      }
      case "setup":
        emit(flags, await cmdSetup(flags, args));
        break;
      case "discover":
        emit(flags, await cmdDiscover(flags, args));
        break;
      default:
        fail(flags, command, `Unknown command '${command}'. Run hts help.`);
    }
  } catch (err) {
    fail(flags, command, err instanceof Error ? err.message : String(err));
  }
}

await main();
