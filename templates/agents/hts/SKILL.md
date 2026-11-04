---
name: hts
description: Use when spinning up or extending AI-process tooling with HT Stack (hts CLI) — init, enable modules, discovery intake, doctor, prime, or harness setup (cursor/claude/codex/t3).
---

# HT Stack (`hts`)

Prefer the `hts` CLI over inventing parallel setup scripts.

## First step

```bash
hts doctor
hts prime
```

## Common flow

```bash
hts init
hts enable beads linear agents docs
hts setup cursor   # or claude | codex | t3
hts discover       # if needs are unclear
```

## Rules

- Secrets stay out of git (`.beads/config.local.yaml`, host secret stores).
- Do not vendor the `ht-stack` factory into client apps — only `hts.stack.yaml` + harness files.
- Use `--json` / `--headless` for agents and CI.
- `bd` remains the issue tracker when the beads module is enabled.
