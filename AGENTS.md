<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# PDB Viewer - Agent Instructions

This repository uses Next.js App Router, pnpm, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS, and Prettier.

## 1. General Purpose Coding Guidelines

### Package And Tooling

- Always use `pnpm`.
- Never use `npm`, `yarn`, or `bun` for installs, scripts, or lockfile changes.
- Add and update dependencies only through `pnpm`.
- Keep `pnpm-lock.yaml` in sync with `package.json`.
- Use Prettier for formatting.
- Use ESLint for linting.
- Use TypeScript for type checking.
- Use Drizzle ORM for database access.
- Use `postgres` as the PostgreSQL driver for Drizzle.
- Before any Next.js-specific code change, read the relevant version-matched guide in `node_modules/next/dist/docs/`.

### Project Structure

- Keep application source code under `src`.
- Use the Next.js `src` pattern with the App Router at `src/app`.
- Keep `public` at the repository root.
- Keep framework and tooling configuration files at the repository root.
- Keep shared application modules outside route segments unless colocation is clearly useful.
- Keep reusable UI components in `src/components`.
- Keep shared utilities in `src/lib`.
- Keep database code under `src/db`.
- Keep Drizzle migrations under `src/db/migrations`.
- Do not add a Pages Router unless the user explicitly asks for it.

### Next.js Conventions

- Follow the App Router conventions from the local Next.js docs.
- Route folders define URL segments.
- A route becomes public only when a `page.tsx` or `route.ts` file exists.
- Use Server Components by default.
- Add `"use client"` only when client-side state, effects, browser APIs, or event handlers are required.
- Push Client Components as far down the component tree as possible.
- Keep route handlers in `route.ts`.
- Keep metadata in the framework-supported metadata exports or metadata files.
- Special Next.js files such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `template.tsx` must follow Next.js export requirements, including default exports where required by the framework.

### Naming And Exports

- React component names must use PascalCase.
- React component file names must use PascalCase, for example `UserMenu.tsx`.
- Folder names must use kebab-case.
- Non-component TypeScript file names must use camelCase, for example `databaseClient.ts`.
- Next.js reserved file names must remain lowercase by framework convention, for example `page.tsx`, `layout.tsx`, and `route.ts`.
- Ordinary TSX component files must use named exports.
- Do not use default exports for ordinary components.
- Only use default exports when required by Next.js special files or another explicit framework/tooling contract.

### Code Style

- Keep modules focused on one responsibility.
- Prefer clear component, function, and variable names over abbreviations.
- Keep component props explicit and typed.
- Prefer composition over large configurable components.
- Keep rendering logic readable; extract helpers only when they clarify the component.
- Keep server-only logic out of Client Components.
- Keep browser-only logic out of Server Components.
- Follow the style already established in the repository unless it conflicts with this file.
- Comments must explain why the code is doing something when that reasoning is not obvious from the code itself.
- Avoid comments that restate the code.
- Keep comments short and precise.
- Use complete-sentence comments immediately before the non-obvious block they explain.

### TypeScript

- Keep `strict` TypeScript enabled.
- Avoid `any`.
- Avoid `unknown` unless the value truly crosses an untyped boundary.
- Avoid nullable types unless `null` or `undefined` is a real domain state.
- Prefer exact types and explicit return types for exported functions.
- Prefer concrete types over broad primitive bags.
- Keep type definitions near the code that owns them unless they are shared across modules.
- Do not silence TypeScript errors with assertions unless the invariant is clear and local.
- Type React props with `type`, not `interface`, unless declaration merging is required.
- Derive types from Drizzle schema where practical instead of duplicating database shapes by hand.

### Drizzle And Database

- Use Drizzle ORM for schema definitions, queries, and migrations.
- Define PostgreSQL tables with `drizzle-orm/pg-core`.
- Keep schema exports in `src/db/schema.ts` or split into focused schema modules imported by `src/db/schema.ts`.
- Keep the Drizzle client in `src/db/client.ts`.
- Read database connection settings from `DATABASE_URL`.
- Do not hard-code database credentials.
- Do not modify generated migration files by hand unless the user explicitly asks for it.
- Prefer explicit column names, constraints, indexes, and relations.
- Keep database access on the server side.
- Do not import the database client into Client Components.
- Keep database queries in server-only modules, Server Components, Route Handlers, or Server Actions.
- Run schema-changing work through Drizzle migrations.

### Environment Variables

- Keep required environment variable examples in `.env.example`.
- Do not commit `.env`, `.env.local`, or other real environment files.
- Validate required environment variables before using them.
- Do not expose secrets through `NEXT_PUBLIC_` variables.
- Only use `NEXT_PUBLIC_` for values that are safe to send to the browser.

### Code Updates

- Code updates must be defensive.
- Do not update working parts of the code unless the user explicitly asks for that change.
- Keep edits scoped to the requested behavior.
- Do not refactor unrelated code opportunistically.
- Do not silently change public routes, component APIs, database schemas, or environment variable names.
- Delete dead code and remove useless imports introduced or exposed by the change.
- Before finishing, manually check for dead code, dead imports, unused exports, and obsolete files that automated tooling did not remove.
- Check the diff and confirm it contains only intentional changes.

### Verification

At the end of every coding session, run the relevant checks:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Review changed files for dead code and dead imports.

When formatting is needed, run:

- `pnpm format`

For database changes:

- Run `pnpm db:generate` after schema changes that require a migration.
- Do not run database migrations against shared or production databases unless the user explicitly asks.

### Git Workflow

- Never commit unless the user explicitly asks for a commit.
- Check the diff before preparing a commit message.
- Commit messages should usually start with a one-line explanation, followed by a bullet list of details.
- When using `git commit` from the command line, do not pass each bullet as a separate `-m` argument because that creates extra blank lines between bullets.
- Commit messages must focus on meaningful information for other developers.
- Commit messages must describe meaningful changes since the last commit.
- Do not include back-and-forth session details in commit messages.
- Do not focus commit messages on low-level implementation details unless those details affect other developers.
- Never add a co-author.
- Never revert user changes unless the user explicitly asks for that revert.

## 2. PDB Viewer Implementation Hints

This project is a readonly viewer for a PDB-derived peptide entity database.

### Application Model

- Search is target-centered.
- PDB entry pages are peptide-centered.
- The main detail route is one page per PDB entry: `/pdb/[pdbId]`.
- Autocomplete is the only expected API route.
- Database reads must live in shared server-side query modules.
- The normal search results flow should remain server-rendered.
- The PDB entry page must remain fully server-rendered.

### Target Architecture

Database access should be centralized under:

```text
src/db/
  client.ts
  schema.ts
  queries/
    entries.ts
    search.ts
```

Application routes should use those query modules directly:

```text
src/app/
  page.tsx
  pdb/[pdbId]/page.tsx
  api/search-suggestions/route.ts
```

UI components should be grouped by domain:

```text
src/components/
  pdb/
  search/
```

The PDB page should use this call path:

```text
src/app/pdb/[pdbId]/page.tsx
  -> src/db/queries/entries.ts
    -> db
```

Search results should use this call path:

```text
src/app/page.tsx?q=...
  -> src/db/queries/search.ts
    -> db
```

Autocomplete should use this call path:

```text
src/components/search/SearchBox.tsx
  -> /api/search-suggestions
    -> src/db/queries/search.ts
      -> db
```

### Domain Model

Each PDB entry page should render:

- Entry metadata.
- Peptide entities associated with the PDB entry.
- Peptide metadata and peptide accessions.
- Curated chain pairs for each peptide entity.

A chain pair is the concrete curated pairing of:

- The peptide chain.
- The receptor/target chain.

The important relationship is:

```text
entries.pdb_id
  -> peptides.pdb_id
  -> chain_pairs.pdb_id

peptides.entity_id
  -> chain_pairs.peptide_entity_id
```

Target-centered tables are used primarily for search, not as first-class detail pages:

```text
search_terms
  -> search_terms_targets
    -> entries
```

`search_terms.term` has a trigram index and should power fuzzy search.
