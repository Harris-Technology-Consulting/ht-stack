# HT Stack — discovery intake

Use when the business need is unclear, or the product system is not reachable yet. Discovery can run **without** a product repo.

## Goal

Turn a short interview into: ranked pains, candidate modules, and a starter ticket set — not a full architecture.

## Ask

1. Who is the operator and what org?
2. What work hurts weekly (top 3)?
3. Which systems must stay (Linear, Notion, ERPs, email, spreadsheets)?
4. Is there a git repo we can plug into now? If not, stay discovery-only.
5. Compliance constraints (MNPI, PII, approval gates)?
6. Which HT Stack modules are in scope first: beads, linear, agents, docs, (planned: kb, app, notion, wizard)?

## Produce

- Filled `.hts/discovery/intake.md`
- 3–7 starter tickets with clear Done definitions
- Recommended `hts enable …` line
- Explicit human blockers (auth, access, decisions)

## Do not

- Invent API keys or commit secrets
- Name or vendor client product source into ht-stack
- Skip intake because a repo exists
