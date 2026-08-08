# Vendored upstream skills

Pinned reference copies of the skills this kit builds on. **Do not edit anything in here** — the
next `./scripts/sync-skills.sh` run replaces these directories wholesale.

| Directory | Upstream | Path |
| --- | --- | --- |
| `angular-developer/`, `angular-new-app/` | [`angular/angular`](https://github.com/angular/angular) | `skills/dev-skills/` |
| `spartan/` | [`spartan-ng/spartan`](https://github.com/spartan-ng/spartan) | `skills/spartan/` |
| `spartan-ng-developer/` | [`mofirojean/angular-ui-skills`](https://github.com/mofirojean/angular-ui-skills) | `skills/spartan-ng-developer/` |

We vendor the Angular skills from `angular/angular` (the source of truth, fetched by SHA through
the GitHub API — no clone) but tell consumers to install from
[`angular/skills`](https://github.com/angular/skills), the small mirror Angular publishes from it.
Same content; the mirror clones in seconds instead of pulling the whole monorepo. This mismatch is
deliberate — do not "fix" it.

Spartan has no such mirror, so consumers do clone the whole monorepo for one skill. It is slow, and
it is the only way to get it.

## `spartan-ng-developer/` is vendored but NOT recommended

`spartan/` is the official skill, written by the Spartan maintainers and released from the library's
own monorepo. It is the only Spartan skill this kit tells consumers to install.

`spartan-ng-developer/` is a community skill that carries the per-component catalogue the official
skill deliberately omits. It is **not** in the recommended install: its worked examples contradict
these standards, tabulated in `.agents/skills/angular-standards/references/spartan-ui.md`.

It stays vendored anyway, for one job — **so that table stays true.** It names specific files and
patterns, and pins the commit it was checked against
([`784a630`](https://github.com/mofirojean/angular-ui-skills/tree/784a630f3cc2a0811cb4b588b94a7d36fff34424/skills/spartan-ng-developer)).
That permalink is what a consumer can follow; this tree is how *we* diff it. Without the pinned
copy nobody notices when upstream fixes a row, and a stale accusation is as bad as a stale
recommendation.

**This re-verification is a maintenance duty of this repository, not of the published skill.**
`spartan-ui.md` ships to consumer apps where neither `vendor/` nor `scripts/` exists, so it carries
the permalink and no instructions about either. The duty lives here:

- After every sync, re-check each row of that table against the new copy. `sync-skills.sh` prints
  the reminder, and it is step 5 of its output for a reason.
- If a row is fixed upstream, delete it and update the pinned commit in **both** `spartan-ui.md`
  and this file. They must always name the same commit.

Two outcomes end this arrangement, and either is fine:

- Upstream fixes them all → reconsider installing it, and delete the table.
- The official skill grows a catalogue → drop `spartan-catalog` from `SOURCES` entirely; nothing
  would still depend on it.

Exact commits and sync date: [UPSTREAM.txt](UPSTREAM.txt). Licences and copyright:
[THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).

## Why they are here and not in `.agents/skills/`

`npx skills add` publishes everything it finds under `.agents/skills/`. Putting these there would
republish other people's work from this repo and hand consumers a frozen copy that goes stale the
moment upstream ships. So consumers install them from the source:

```bash
npx skills add angular/skills -s angular-developer
npx skills add https://github.com/spartan-ng/spartan --skill spartan
```

Two directories here are **not** in that install, for different reasons. `angular-new-app` is
vendored only because `sync-skills.sh` pulls the whole `dev-skills/` path; `spartan-ng-developer`
is vendored on purpose, to keep the conflict list above verifiable. Both exclusions are explained
in the table in `.agents/skills/angular-standards/SKILL.md`.

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
