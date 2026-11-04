export type OutputMode = "text" | "json";

export type GlobalFlags = {
  json: boolean;
  headless: boolean;
  help: boolean;
  cwd: string;
  profile?: string;
};

export const KNOWN_MODULES = [
  "beads",
  "linear",
  "agents",
  "docs",
  "kb",
  "app",
  "notion",
  "wizard",
] as const;

export type ModuleName = (typeof KNOWN_MODULES)[number];

export const PLANNED_MODULES = new Set<ModuleName>(["kb", "app", "notion", "wizard"]);

export const HARNESSES = ["cursor", "claude", "codex", "t3"] as const;
export type HarnessName = (typeof HARNESSES)[number];

export type StackManifest = {
  version: 1;
  product: "ht-stack";
  modules: Partial<Record<ModuleName, { enabled: boolean; notes?: string }>>;
  createdAt: string;
  updatedAt: string;
};

export type CommandResult = {
  ok: boolean;
  command: string;
  message: string;
  data?: unknown;
  next?: string[];
};
