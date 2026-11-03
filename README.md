# HT Stack

Harris Technology Consulting’s internal tool for spinning up **AI processes** on new or existing work.

`hts` is the CLI; this repo (`ht-stack`) is where we build it. We install once, then `hts init` into a target project — same shape as modern dev platforms (CLI + agent setup). **We don’t sell the model or harness.** The product is the surrounding context and tooling; we plug into whatever agent runtime the business already runs (Claude, Codex, Cursor, T3, …).

The delivery motion we sell: work inside the organization efficiently and retool work into AI-ready workflows. This binary is how Harris repeats that.

## Current state

- This private repo exists and is the factory source (rename to `ht-stack` on GitHub if still `htc-stack`).
- Beads ↔ Linear sync is wired for Harris tracking.
- The `hts` CLI, `scripts/install.sh`, and shipped prompts are **not built yet**.

## Install (target — not live yet)

Requires GitHub auth to the private org (`gh auth login` or `GH_TOKEN`):

```bash
curl -fsSL -H "Authorization: Bearer $(gh auth token)" \
  https://raw.githubusercontent.com/Harris-Technology-Consulting/ht-stack/main/scripts/install.sh \
  | bash
```

Then:

```bash
hts setup cursor   # or: claude | codex | t3
```

## Quick start (target)

```bash
# existing repo (common)
cd their-app && hts init && hts enable linear beads docs

# new codebase
hts init

# unattended
hts init --headless -f profile.yaml
```

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

## Secrets

Secrets never belong in git. API tokens and similar go in a local secret store / host auth — never commit them.

## Modes

- **In-repo** — default; plug into the git root, non-destructive
- **Headless** — no TTY; profile / flags / env / secrets only
- **Discovery-first** — intake when needs (or repo access) aren’t clear yet
