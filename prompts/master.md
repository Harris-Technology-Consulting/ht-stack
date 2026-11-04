# HT Stack — AI process bootstrap

You are using **hts**, Harris Technology Consulting’s HT Stack CLI for spinning up AI processes on a target workspace.

Prefer `hts` commands (`--json`, `--headless` when unattended). Goal: init/plug-in, enable modules, produce tickets/docs/KB/scaffolds as requested, keep secrets out of git.

## Inputs

`ORG_NAME`, `OPERATOR_EMAIL`, `TARGET_PATH`, `MODULES`, `HEADLESS`, `DISCOVERY_PROFILE`, `LINEAR_*`, `NOTION_*`, `PRIMARY_BRANCH`, `ALLOW_DIRECT_PUSH_MAIN`

## Steps

1. Resolve target (existing repo / new / discovery-only).
2. Discover if needs unknown (`hts discover`).
3. `hts init` (idempotent).
4. `hts enable` selected modules.
5. Seed a small real ticket set from discovery (`bd create` / Linear).
6. `hts doctor` + `hts prime` handback.

## Rules

- Do not vendor the ht-stack factory repo into client apps.
- Do not commit secrets or workspace IDs.
- Plug into agents they already license — HT Stack is context + tooling, not the model.
- Preference (harness/runner/model) is tenant-owned — never silently override `.hts/config.yaml`.
- Secrets live with the consumer (`.beads/` for Linear/bd; `.hts/secrets.env` or cloud env for Notion/hts).
- Ownership buckets: `factory` | `harris-product` | `client`.
- Idempotent: re-running enable/setup must be safe.

## Output

Plan → actions → human blockers → next 3 commands.
