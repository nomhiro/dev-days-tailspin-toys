---
description: 'TypeScript formatting and documentation conventions'
applyTo: '**/*.ts'
---

# TypeScript Instructions

## Formatting

Use the formatting conventions already used by the project:

- Indent application and data-layer TypeScript, unit tests, and `drizzle.config.ts` / `vitest.config.ts` with four spaces.
- Indent Playwright E2E specs and `playwright.config.ts` with two spaces, as described in [`playwright.instructions.md`](playwright.instructions.md).
- Use single quotes for strings, except when escaping would be clearer with double quotes.
- End statements with semicolons.
- Use trailing commas in multiline lists, objects, and parameter lists.
- End files with a newline.

ESLint enforces these formatting rules for TypeScript files. Run `npm run lint` to check them.

## Comments and TSDoc

- Explain intent, rationale, and non-obvious decisions; do not narrate mechanics or restate code.
- Prefer descriptive names and straightforward code over comments that duplicate what the code says.
- Keep comments current when changing the related code; remove or correct outdated comments in the same change.
- Document exported functions with TSDoc when required by the applicable data-layer or component instructions. Describe purpose, parameters, and return values.
- Use `@param` for each parameter and `@returns` for the returned value. For injectable data helpers, explain the `db` parameter and how it supports use with both the application database and test databases.
