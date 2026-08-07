# Agent instructions

You are working on a long-lived Angular application. Target: **Angular 22.1+**, designed to stay
on the upgrade path through v23, v24 and beyond for 10+ years.

## Read this first

**[.agents/skills/angular-standards/SKILL.md](.agents/skills/angular-standards/SKILL.md)** — the
house standards. Read it before writing, refactoring or reviewing any code. It holds the six
non-negotiable rules and routes you to the topic file that applies.

The rules live there and only there. This file exists so that any tool which reads `AGENTS.md`
finds them.

## Precedence

1. **`AGENTS.local.md`** — this repo's deliberate exceptions. Overrides everything below.
2. **`.agents/skills/angular-standards/references/`** — house rules.
3. **The upstream skills** — `angular-developer` (`angular/angular`) and `spartan-ng-developer`
   (`mofirojean/angular-ui-skills`). Framework and component API depth. Install them alongside;
   the SKILL.md has the exact commands, including which sibling skills to exclude and why. Keep
   them current with `npx skills update`.

Where the house rules and an upstream skill disagree, the house rules win.

## Reviewing a diff

Ask for *"review my changes against the standards"*. The process lives in
[.agents/skills/angular-standards/references/code-review.md](.agents/skills/angular-standards/references/code-review.md).
It does not restate rules — it reads the `Audit:` lines in the standards files and checks against
them. When you add a rule, add its `Audit:` line in the same file. One source of truth.
