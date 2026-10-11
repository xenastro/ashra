# Ashra (عشرة)

A phone-first web app (installable PWA) that helps children learn their times tables calmly, plus a parent dashboard. Live at https://ashra.aburaddad.com. [SPEC.md](SPEC.md) is the product spec and the learning method; [README.md](README.md) has setup details.

## Layout

- `src/engine/` — the learning engine. Pure TypeScript, no DOM, unit-tested (`*.test.ts`). `mastery.ts` turns the event log into per-fact levels; `session.ts` builds the check-up and the practice sessions; `facts.ts` holds the teaching order.
- `src/child/` — the child's app. `src/parent/` — the parent area and the operator dashboard (`Admin.tsx`).
- `src/components/` — shared UI. `src/locales/{en,ar}.json` — every user-facing string.
- Public pages, routed in `src/main.tsx`: `/privacy`, `/how-it-works` (`Help.tsx`), `/install` (`Install.tsx`, with phone detection in `homeScreen.ts`).
- `worker/` — the API: a Cloudflare Worker (Hono) with D1. The schema lives in `migrations/`. The Worker also serves `./dist`.

## How the data works

Every answer is an event, saved to IndexedDB on the phone first and then synced to the Worker. Progress is never stored directly: it is always worked out again from the events (`deriveState`). So a change to the method applies to everyone's history at once. Don't add stored progress fields; derive them.

## Commands

```sh
npm run build        # type-checks the app and the worker, then runs the vite build (the Worker serves ./dist)
npm test             # vitest: engine and i18n unit tests
npm run dev:api      # Worker + local D1 on :8787 (reads .dev.vars)
npm run dev          # app on :5173, proxies /api to :8787
npx playwright test  # e2e on a Pixel 7-sized browser; needs both dev servers running
npm run db:migrate:local
```

Run `npm run build` and `npm test` before committing. Run the relevant e2e spec when you change UI flows.

## Signing in locally

The local D1 has its own accounts, so a live account won't work there. Open http://localhost:5173 (not 127.0.0.1, because passkeys need `localhost`), tap "I'm a grown-up", then "Create account", and use any email and password. Nothing is emailed: reset links appear on screen. The bot check (Turnstile) is off locally, and there are no sign-up limits. To see the operator dashboard, sign up as the `ADMIN_EMAILS` address in `.dev.vars` (`admin@example.com`). To act as a child, tap "Start practising" on the front door instead.

## Deploying

The Worker is connected to GitHub: **every push to `main` deploys to production**.

- **Branch for each feature or fix**, named for what it does (`install-guide`, `fix-numpad-ios`), and commit there. Pushing a branch is safe: only `main` deploys.
- **Merge into `main` when it's done**: `npm run build` and `npm test` pass, and the relevant e2e specs pass. The merge is the release, and it goes live automatically.
- Don't commit straight to `main`, and don't merge half-finished work. Keep one feature or fix per branch, so a release can be understood and undone on its own.

D1 migrations are **not** applied by the deploy. When adding a migration, run `npm run db:migrate:remote` before pushing code that needs it, and keep migrations backward compatible.

When running wrangler by hand: the `CLOUDFLARE_ACCOUNT_ID` environment variable on this machine points at a different account. Ashra's account is `f436429c…`, so override it for the command.

## Conventions

- **Two languages, always.** Every string goes in both `en.json` and `ar.json`, with the same keys and placeholders (a unit test checks this). Write the Arabic too, not just the English.
- **Arabic.** Pages turn right to left, but sums, the number pad and animations stay left to right (`dir="ltr"`). Arabic strings are written with ٠١٢٣ digits; `t()`/`n()` convert digits to the learner's choice. In a sum inside Arabic text, use a Latin `?` (not `؟`), or the sum flips direction.
- **Tone.** Short, calm, plain words; no jargon. Child screens speak to the child, parent screens to the parent. Never use red, timers or "wrong" buzzers. Mistakes are gentle (see SPEC §2).
- **Phone-first.** Design for about 360–412 px wide, with no horizontal scroll. The user can't test on an iPhone: check iOS behaviour by emulating it in Playwright (iPhone user agent and viewport) and reasoning about Safari.
- **Browser storage** (`localStorage`) is only for per-phone conveniences, such as "Not now" on a card or the parent language. Wrap every access in try/catch.
- **Match the surrounding code.** Short doc comments on why, not what. Small components. No new dependencies without a good reason.
- **Commit messages.** A short title, then a plain-language paragraph or two on what changed for users and why.
