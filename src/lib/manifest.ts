import { join } from "node:path";
import { pathExists, readText, writeText } from "./fs.ts";
import type { ModuleName, StackManifest } from "./types.ts";
import { KNOWN_MODULES } from "./types.ts";

export const MANIFEST_NAME = "hts.stack.yaml";

export function manifestPath(root: string): string {
  return join(root, MANIFEST_NAME);
}

export function emptyManifest(): StackManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    product: "ht-stack",
    modules: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Minimal YAML round-trip for our small schema — avoids a dependency. */
export function serializeManifest(m: StackManifest): string {
  const lines: string[] = [
    `# HT Stack project footprint — do not vendor the factory repo here`,
    `version: ${m.version}`,
    `product: ${m.product}`,
    `createdAt: ${JSON.stringify(m.createdAt)}`,
    `updatedAt: ${JSON.stringify(m.updatedAt)}`,
    `modules:`,
  ];
  const names = Object.keys(m.modules) as ModuleName[];
  if (names.length === 0) {
    lines.push("  {}");
  } else {
    for (const name of names.sort()) {
      const mod = m.modules[name]!;
      lines.push(`  ${name}:`);
      lines.push(`    enabled: ${mod.enabled ? "true" : "false"}`);
      if (mod.notes) lines.push(`    notes: ${JSON.stringify(mod.notes)}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function parseManifest(raw: string): StackManifest {
  const base = emptyManifest();
  const version = /(?:^|\n)version:\s*(\d+)/.exec(raw);
  if (version) base.version = Number(version[1]) as 1;
  const product = /(?:^|\n)product:\s*([^\n#]+)/.exec(raw);
  if (product) base.product = product[1].trim() as "ht-stack";
  const createdAt = /(?:^|\n)createdAt:\s*"([^"]+)"/.exec(raw);
  if (createdAt) base.createdAt = createdAt[1];
  const updatedAt = /(?:^|\n)updatedAt:\s*"([^"]+)"/.exec(raw);
  if (updatedAt) base.updatedAt = updatedAt[1];

  for (const name of KNOWN_MODULES) {
    const block = new RegExp(`(?:^|\\n)\\s{2}${name}:\\n((?:\\s{4}.+\\n)*)`).exec(raw);
    if (!block) continue;
    const enabled = /enabled:\s*(true|false)/.exec(block[1]);
    const notes = /notes:\s*"([^"]*)"/.exec(block[1]);
    base.modules[name] = {
      enabled: enabled ? enabled[1] === "true" : false,
      ...(notes ? { notes: notes[1] } : {}),
    };
  }
  return base;
}

export function loadManifest(root: string): StackManifest | null {
  const path = manifestPath(root);
  if (!pathExists(path)) return null;
  return parseManifest(readText(path));
}

export function saveManifest(root: string, m: StackManifest): string {
  const path = manifestPath(root);
  const next = { ...m, updatedAt: new Date().toISOString() };
  writeText(path, serializeManifest(next));
  return path;
}

export function enableModules(
  manifest: StackManifest,
  modules: ModuleName[],
  notes?: string,
): StackManifest {
  const next = { ...manifest, modules: { ...manifest.modules } };
  for (const name of modules) {
    next.modules[name] = {
      enabled: true,
      ...(notes ? { notes } : next.modules[name]?.notes ? { notes: next.modules[name]!.notes } : {}),
    };
  }
  return next;
}
