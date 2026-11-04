import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const hts = async (cwd: string, args: string[]) => {
  const proc = Bun.spawn(["bun", join(root, "src/cli.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};

describe("hts cli stub", () => {
  test("version --json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hts-"));
    const res = await hts(dir, ["version", "--json"]);
    expect(res.exitCode).toBe(0);
    const json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.version).toBe("0.1.0");
  });

  test("init writes tenant preference + secret example", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hts-"));
    const res = await hts(dir, ["init", "--json"]);
    expect(res.exitCode).toBe(0);
    const json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.preference.ownership).toBe("harris-product");
    expect(existsSync(join(dir, ".hts", "config.yaml"))).toBe(true);
    expect(existsSync(join(dir, ".hts", "secrets.env.example"))).toBe(true);
    expect(existsSync(join(dir, "hts.stack.yaml"))).toBe(true);
    const gi = readFileSync(join(dir, ".gitignore"), "utf8");
    expect(gi).toContain(".hts/secrets.env");
    expect(gi).toContain(".beads/config.local.yaml");
  });

  test("init + enable + doctor", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hts-"));
    let res = await hts(dir, ["init", "--json"]);
    expect(res.exitCode).toBe(0);
    let json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.manifestCreated).toBe(true);

    res = await hts(dir, ["enable", "docs", "agents", "--json"]);
    expect(res.exitCode).toBe(0);
    json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.modules).toContain("docs");

    res = await hts(dir, ["doctor", "--json"]);
    expect(res.exitCode).toBe(0);
    json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.enabledModules).toEqual(expect.arrayContaining(["docs", "agents"]));
    expect(json.data.preference.harness).toBe("cursor");
    // doctor must not echo secret values even if file exists
    writeFileSync(join(dir, ".hts", "secrets.env"), "NOTION_API_KEY=super-secret-value\n");
    res = await hts(dir, ["doctor", "--json"]);
    expect(res.stdout).not.toContain("super-secret-value");
    json = JSON.parse(res.stdout);
    expect(json.data.secrets.some((s: { id: string; present: boolean }) => s.id === "hts_secrets_file" && s.present)).toBe(
      true,
    );
  });

  test("doctor fails when linear enabled without credentials", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hts-"));
    await hts(dir, ["init", "--json"]);
    await hts(dir, ["enable", "linear", "--json"]);
    const res = await hts(dir, ["doctor", "--json"]);
    expect(res.exitCode).toBe(0); // command runs
    const json = JSON.parse(res.stdout);
    expect(json.ok).toBe(false);
    expect(json.data.secrets.find((s: { id: string }) => s.id === "linear_api_key").present).toBe(false);
  });

  test("init --headless -f profile enables modules without TTY", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hts-"));
    const profile = join(dir, "profile.yaml");
    writeFileSync(
      profile,
      [
        "ownership: client",
        "harness: claude",
        "runner: local",
        "forge: github",
        "setup: true",
        "modules:",
        "  - docs",
        "  - agents",
        "",
      ].join("\n"),
    );
    const res = await hts(dir, ["init", "--headless", "-f", profile, "--json"]);
    expect(res.exitCode).toBe(0);
    const json = JSON.parse(res.stdout);
    expect(json.ok).toBe(true);
    expect(json.data.preference.ownership).toBe("client");
    expect(json.data.preference.harness).toBe("claude");
    expect(json.data.modules).toEqual(["docs", "agents"]);
    expect(existsSync(join(dir, "docs", "ht-stack.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents", "skills", "hts", "SKILL.md"))).toBe(true);
  });
});

