# HT Stack

Harris Technology Consulting’s internal tool for spinning up **AI processes** on new or existing work.

`hts` is the CLI; this repo (`ht-stack`) is where we build it. We install once, then `hts init` into a target project — same shape as modern dev platforms (CLI + agent setup). **We don’t sell the model or harness.** The product is the surrounding context and tooling; we plug into whatever agent runtime the business already runs (Claude, Codex, Cursor, T3, …).

The delivery motion we sell: work inside the organization efficiently and retool work into AI-ready workflows. This binary is how Harris repeats that.

## Current state

- Public factory repo: [`Harris-Technology-Consulting/ht-stack`](https://github.com/Harris-Technology-Consulting/ht-stack).
- Beads ↔ Linear sync is wired for Harris tracking.
- **`hts` CLI** supports interactive `init`, `enable`, `discover`, `doctor`, `prime`, `setup`.
- `scripts/install.sh` installs a Release binary when published, otherwise clones source and wraps with bun.
- Master + discovery prompts live in `prompts/`.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Harris-Technology-Consulting/ht-stack/master/scripts/install.sh | bash
```

Ensure `~/.local/bin` is on your `PATH`, then:

```bash
hts version
cd /path/to/exodus && hts init
```

**From this repo (dev):**

```bash
bun install
./bin/hts version
```


## Quick start

```bash
# interactive — asks target path, ownership, harness/runner, modules, then enable+setup
cd their-app && hts init

# unattended / agents
hts init --headless -f profile.yaml
```

`hts init` is the guided entrypoint (pointing + prefs). `--headless` skips prompts; use a profile to enable modules/setup without a TTY.

## Commands (target)

| Command | Purpose |
| --- | --- |
| `hts init` | Scaffold or plug into a git repo |
| `hts enable` | Turn modules on (idempotent) |
| `hts discover` | Business intake → needs / starter tickets |
| `hts doctor` | Healthcheck |
| `hts prime` | Print factory context for agents |
| `hts setup` | Install agent skill/hooks for a harness |

Flags: `--headless`, `-f profile.yaml`, `--json`.

## Modules

| Module | Notes |
| --- | --- |
| `beads` | Local issue graph / agent task memory |
| `linear` | Board sync |
| `agents` | Harness adapters + instruction files |
| `docs` | Doc scaffolds |
| `kb` | Knowledge-base scaffolds *(planned)* |
| `app` | App scaffolds *(planned)* |
| `notion` | Durable specs pointer *(planned)* |
| `wizard` | Guided setup flow *(planned)* |

Project footprint stays small (`hts.stack.yaml` + harness files) — do not vendor this factory repo into client apps.

## Agents

```bash
hts setup claude|codex|cursor|t3
```

These are **adapters** into licenses/harnesses they already pay for. HT Stack ships context, tickets, prompts, and modules — not the brain. Bring-your-own agent remains the long-term default as the surface widens.

## Secrets + tenant config

See [`docs/tenant-config.md`](docs/tenant-config.md).

- **Preference** (harness, runner, ownership, forge): `.hts/config.yaml`
- **HT Stack secrets**: `.hts/secrets.env` (gitignored); example at `.hts/secrets.env.example`
- **Linear for beads**: `.beads/config.local.yaml` (gitignored) — secrets live with the consumer
- Cloud runners: same keys in harness/Cloud env
- `hts doctor` checks presence; never prints values

## Modes

- **In-repo** — default; plug into the git root, non-destructive
- **Headless** — no TTY; profile / flags / env / secrets only
- **Discovery-first** — intake when needs (or repo access) aren’t clear yet
