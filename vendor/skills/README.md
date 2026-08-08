# Vendored upstream skills

Pinned reference copies of the skills this kit builds on. **Do not edit anything in here** — the
next `./scripts/sync-skills.sh` run replaces these directories wholesale.

| Directory | Upstream | Path |
| --- | --- | --- |
| `angular-developer/`, `angular-new-app/` | [`angular/angular`](https://github.com/angular/angular) | `skills/dev-skills/` |
| `spartan/` | [`spartan-ng/spartan`](https://github.com/spartan-ng/spartan) | `skills/spartan/` |

We vendor the Angular skills from `angular/angular` (the source of truth, fetched by SHA through
the GitHub API — no clone) but tell consumers to install from
[`angular/skills`](https://github.com/angular/skills), the small mirror Angular publishes from it.
Same content; the mirror clones in seconds instead of pulling the whole monorepo. This mismatch is
deliberate — do not "fix" it.

Spartan has no such mirror, so consumers do clone the whole monorepo for one skill. It is slow, and
it is the only way to get it.

## Only vendor what the standards cite

A third-party Spartan skill was vendored here for a while, to substantiate a table cataloguing how
it conflicted with these standards. Both are gone now.

The principle worth keeping: **`vendor/` is for sources the standards cite by filename, and nothing
else.** A skill the kit tells people not to install does not need a local copy — and a per-file
catalogue of someone else's mistakes is a maintenance burden that ages badly and reads worse. The
exclusion list in `.agents/skills/angular-standards/SKILL.md` states the rule; that is enough.

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

`angular-new-app` is the one directory here that is **not** in that install: it is vendored only
because `sync-skills.sh` pulls the whole `dev-skills/` path. Why it is excluded is in the table in
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
