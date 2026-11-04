# Tenant config + secrets

How Harris vs client tenants differ **without forking** HT Stack.

## Ownership buckets

| Bucket | Examples | Who owns forge / board / wiki / agent licenses |
| --- | --- | --- |
| **Factory** | `ht-stack`, `hts` | Harris |
| **Harris products** | Exodus, landing | Harris |
| **Client assets** | Client apps, their Linear/Notion, their agent seats | Client |

Exodus dogfood proves **factory → Harris product**. It is not a stand-in for client ownership.

## Opinionated vs preference

| Kind | Examples | Rule |
| --- | --- | --- |
| **Opinionated** (HT Stack) | `hts.stack.yaml` layout, prompts, `hts doctor` checks, loop playbook | Shipped defaults; safe to overwrite with `hts` upgrades when documented |
| **Preference** (tenant/user) | harness, runner (`local` \| `cloud`), model, forge host, modules on/off, board/wiki targets | Never silently override |

BYO agents: the **harness/runner/model** are preference (which “brain”). HT Stack supplies **context** (opinionated fact), not the model.

## Where config lives

| Concern | Path | Git |
| --- | --- | --- |
| Modules on/off | `hts.stack.yaml` | commit |
| Preference (harness, runner, model, forge, ownership) | `.hts/config.yaml` | commit team defaults if shared; else local |
| HT Stack secrets (Notion token, etc.) | `.hts/secrets.env` | **never** |
| Example secret keys | `.hts/secrets.env.example` | commit |
| Notion pointers (v1) | `.hts/notion.yaml` | commit ids; tokens only via secrets/env |
| Beads / Linear API key | `.beads/config.local.yaml` | **never** (beads local override) |
| Cloud runners | Host / Cursor Cloud / harness env | not in git |

**Secrets live with the consumer:** Linear for `bd` stays under `.beads/`; Notion/hts under `.hts/`.

## Dual runner

- `runner: local` — agent on an operator machine; PRs via that user’s `gh`/git auth.
- `runner: cloud` — agent in a cloud harness; **BYO**: the tenant’s own cloud agent driver (their Cursor/Claude/… org), not necessarily Harris-hosted.

GitHub App is **optional** (unattended bot identity). Default PR path = tenant agent git auth. Humans merge until trusted.

## Forge (prototype)

GitHub only in code paths. Multi-forge (GitLab/Bitbucket) is documented as future client-owned reality — no fake forge abstraction until a second backend is real.

## Guided entry: `hts init`

Interactive `hts init` (TTY, not `--headless` / `--json`) asks:

1. Target repo path (pointing)
2. Ownership bucket
3. Harness + runner (+ model hint, forge preference)
4. Modules to enable
5. Whether to run `hts setup <harness>`

It then writes preference, enables modules, optional setup, and a reusable `.hts/profile.yaml` for later `--headless -f` runs.

## Doctor

`hts doctor` checks that required files/keys **exist** (and that secret files are gitignored). It must **never print secret values**.

