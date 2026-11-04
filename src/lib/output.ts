import type { CommandResult, GlobalFlags } from "./types.ts";

export function emit(flags: GlobalFlags, result: CommandResult): void {
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.message);
  if (result.next?.length) {
    console.log("");
    console.log("Next:");
    for (const step of result.next) console.log(`  ${step}`);
  }
}

export function fail(flags: GlobalFlags, command: string, message: string, code = 1): never {
  emit(flags, { ok: false, command, message });
  process.exit(code);
}
