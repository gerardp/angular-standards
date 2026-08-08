# Third-party notices

This repository keeps a pinned reference copy of agent skills from other projects. Those files are
**copied verbatim** and remain under their original copyright and licence. They live under
`vendor/skills/` and are re-synced by `scripts/sync-skills.sh`; the exact commit of each is recorded
in `vendor/skills/UPSTREAM.txt`.

They are deliberately **not** published as skills from this repository — `npx skills add` only sees
`.agents/skills/`, so a consumer installs them from their own upstreams and always gets the current
version. See the install commands in `.agents/skills/angular-standards/SKILL.md`.

Nothing in this file is covered by the `LICENSE` grant at the root of this repository.

---

## `vendor/skills/angular-developer/` and `vendor/skills/angular-new-app/`

- **Source:** [angular/angular](https://github.com/angular/angular), path `skills/dev-skills/`
- **Licence:** MIT
- **Copyright:** Copyright (c) 2010-2026 Google LLC. https://angular.dev/license

```
The MIT License

Copyright (c) 2010-2026 Google LLC. https://angular.dev/license

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## `vendor/skills/spartan/`

- **Source:** [spartan-ng/spartan](https://github.com/spartan-ng/spartan), path `skills/spartan/`
- **Licence:** MIT
- **Copyright:** Copyright (c) 2024 ROBIN GOETZ

```
The MIT License (MIT)

Copyright (c) 2024 ROBIN GOETZ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## `vendor/skills/spartan-ng-developer/`

- **Source:** [mofirojean/angular-ui-skills](https://github.com/mofirojean/angular-ui-skills), path `skills/spartan-ng-developer/`
- **Licence:** MIT
- **Copyright:** Copyright (c) 2026 Mofiro Jean

```
MIT License

Copyright (c) 2026 Mofiro Jean

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Maintaining this file

`scripts/sync-skills.sh` updates the vendored files but **not** this file. If you add a source to
`SOURCES` in that script, add its notice here in the same commit. If a source changes its licence
upstream, that is a decision to re-evaluate, not a diff to accept silently.
