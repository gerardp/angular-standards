# Changelog

The changelog lives **inside the skill**, at
[`.agents/skills/angular-standards/CHANGELOG.md`](.agents/skills/angular-standards/CHANGELOG.md).

That is deliberate. `npx skills update angular-standards` overwrites the installed skill directory
in place, so the changelog has to arrive in the same diff as the rules it describes — a changelog
that stays behind in this repository is one the consumer never reads. The versioning policy, the
release procedure, and the full history are all in that file.
