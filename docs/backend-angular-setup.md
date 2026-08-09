# Backend + Angular setup

These standards work with any backend — Node.js, AdonisJS, Rails, Django, or another framework —
as long as the Angular workspace lives in `frontend/` and the agent skills are installed at the
repository root. This walkthrough uses Laravel with Sanctum, Fortify, and Boost; replace the
Laravel-specific section when using another backend.

## Prerequisites

All variants require Node.js with npm and Git. The Laravel example also requires PHP, Composer, the
Laravel installer, and a configured database.

## Laravel backend

Create the application without a starter kit, then enter its directory:

```bash
laravel new mi-app
cd mi-app
composer require laravel/boost --dev
php artisan boost:install
```

Install Sanctum and Fortify:

```bash
php artisan install:api
composer require laravel/fortify
php artisan fortify:install
php artisan migrate
```

Disable Fortify's views in `config/fortify.php`:

```php
'views' => false,
```

Enable Sanctum's stateful API middleware in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

Refresh Laravel Boost's resources:

```bash
php artisan boost:update --discover
```

## Angular frontend and agent skills

Run these commands from the backend repository root. Installing the skills here lets an agent
started from that root discover both the backend and frontend guidance.

```bash
npx skills add gerardp/angular-standards -a codex -a claude-code -y
npx skills add angular/skills -s angular-developer -a codex -a claude-code -y
npx skills add https://github.com/spartan-ng/spartan --skill spartan -a codex -a claude-code -y
curl -fsSLo AGENTS.local.md https://raw.githubusercontent.com/gerardp/angular-standards/main/AGENTS.local.md

npx @angular/cli@latest new frontend --style css --strict --no-ssr --skip-git --ai-config none --interactive=false
cd frontend
```

Merge these options into the generated `tsconfig.json`; do not replace the entire file:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "angularCompilerOptions": {
    "strictTemplates": true
  }
}
```

## Tailwind CSS v4

```bash
npm install tailwindcss @tailwindcss/postcss postcss --force
```

Create `.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

Add this at the beginning of `src/styles.css`:

```css
@import 'tailwindcss';
```

## Spartan NG

Initialise Spartan and create `components.json` before generating the first component:

```bash
npm i -D @spartan-ng/cli
ng g @spartan-ng/cli:init --project=frontend --theme=neutral --styles-entry-point=src/styles.css
```

```json
{
  "componentsPath": "src/app/ui/helm",
  "importAlias": "@spartan-ng/helm",
  "style": "nova"
}
```

Open the component selector and choose the required components or `all`:

```bash
ng g @spartan-ng/cli:ui
```

Confirm that the configuration and selected components were detected:

```bash
ng g @spartan-ng/cli:info --json
```

The result must report `config.found: true`, non-null Tailwind, CDK and Brain versions, and the
selected components under `installedComponents`.

## Git

Return to the backend root before creating the initial commit:

```bash
cd ..
git init
git add .
git commit -m "Init"
```
