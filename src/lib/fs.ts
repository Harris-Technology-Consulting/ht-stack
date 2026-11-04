import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function writeFileIfAbsent(path: string, contents: string): "created" | "exists" {
  if (existsSync(path)) return "exists";
  ensureDir(dirname(path));
  writeFileSync(path, contents, "utf8");
  return "created";
}

export function writeText(path: string, contents: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, contents, "utf8");
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}

export function readTextIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

export function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true, force: false, errorOnExist: false });
}

export function resolveCwd(cwdFlag?: string): string {
  return resolve(cwdFlag || process.cwd());
}

export function packageRoot(): string {
  // bin/hts -> repo root; compiled binary falls back to cwd-relative templates via Bun
  return resolve(join(import.meta.dir, "../.."));
}

export function templatePath(...parts: string[]): string {
  return join(packageRoot(), "templates", ...parts);
}

export function promptPath(...parts: string[]): string {
  return join(packageRoot(), "prompts", ...parts);
}
