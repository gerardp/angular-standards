# Local overrides

Repo-specific exceptions to `docs/standards/`. This file is yours — nothing regenerates it, and
`scripts/sync-skills.sh` never touches it.

Use it for deviations you have decided on deliberately. Anything here **overrides**
`docs/standards/`.

## Format

Record the rule you are overriding, the reason, and — critically — the condition under which the
override goes away. An override without an expiry condition becomes permanent by accident.

```markdown
### Override: <rule being overridden>

- **Standard:** docs/standards/<file>.md — "<the rule>"
- **Deviation:** <what we do instead>
- **Reason:** <why>
- **Removal condition:** <what has to be true for this to go away>
- **Owner:** <name>
- **Added:** <YYYY-MM-DD>
```

## Active overrides

_None yet._

## Project facts agents should know

Fill this in as the app takes shape. It is the highest-value section in the file — it stops agents
guessing at things they cannot infer from the code.

- **Backend / API base URL:**
- **Auth model:** (e.g. httpOnly cookie session, OIDC provider, custom JWT)
- **Deployment target:** (static host, Node SSR, edge)
- **Rendering mode:** (CSR only / SSG / SSR — see docs/standards/routing.md)
- **Canonical reference implementations:** point at real files once they exist, e.g.
  - Feature with store: `src/app/features/<x>/`
  - Data-access service: `src/app/data-access/<x>-api.service.ts`
