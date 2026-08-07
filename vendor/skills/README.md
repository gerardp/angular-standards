# Vendored upstream skills

Pinned reference copies of the skills this kit builds on. **Do not edit anything in here** — the
next `./scripts/sync-skills.sh` run replaces these directories wholesale.

| Directory | Upstream | Path |
| --- | --- | --- |
| `angular-developer/`, `angular-new-app/` | [`angular/angular`](https://github.com/angular/angular) | `skills/dev-skills/` |
| `spartan-ng-developer/` | [`mofirojean/angular-ui-skills`](https://github.com/mofirojean/angular-ui-skills) | `skills/spartan-ng-developer/` |

We vendor the Angular skills from `angular/angular` (the source of truth, fetched by SHA through
the GitHub API — no clone) but tell consumers to install from
[`angular/skills`](https://github.com/angular/skills), the small mirror Angular publishes from it.
Same content; the mirror clones in seconds instead of pulling the whole monorepo. This mismatch is
deliberate — do not "fix" it.

Exact commits and sync date: [UPSTREAM.txt](UPSTREAM.txt). Licences and copyright:
[THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).

## Why they are here and not in `.agents/skills/`

`npx skills add` publishes everything it finds under `.agents/skills/`. Putting these there would
republish other people's work from this repo and hand consumers a frozen copy that goes stale the
moment upstream ships. So consumers install them from the source:

```bash
npx skills add angular/skills -s angular-developer
npx skills add mofirojean/angular-ui-skills -s spartan-ng-developer
```

`angular-new-app` is vendored here because `sync-skills.sh` pulls the whole `dev-skills/` path, but
it is deliberately **not** in the recommended project install — see the table in
`.agents/skills/angular-standards/SKILL.md`.

They stay here for two reasons: `.agents/skills/angular-standards/references/` cites specific
upstream files by name and those citations need to be verifiable, and an upstream change should
land as a reviewable diff rather than a surprise.

## Keeping them current

```bash
./scripts/sync-skills.sh --check    # report drift, change nothing (use in CI)
./scripts/sync-skills.sh            # after every Angular upgrade, and quarterly
```

After a sync, read the diff. If upstream guidance now contradicts
`.agents/skills/angular-standards/references/`, reconcile it deliberately — the house rules win, but
only once someone has decided they still should.
