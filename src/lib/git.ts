import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { pathExists } from "./fs.ts";

export function findGitRoot(start: string): string | null {
  let cur = start;
  for (;;) {
    if (pathExists(join(cur, ".git"))) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

export function runGit(args: string[], cwd: string): { ok: boolean; stdout: string; stderr: string } {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  return {
    ok: res.status === 0,
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
  };
}

export function ensureGitRepo(cwd: string): { root: string; created: boolean } {
  const existing = findGitRoot(cwd);
  if (existing) return { root: existing, created: false };
  const init = runGit(["init"], cwd);
  if (!init.ok) {
    throw new Error(`git init failed: ${init.stderr || init.stdout}`);
  }
  return { root: cwd, created: true };
}
