# Study Loop

A phone-first study app that replaces idle scrolling with one question at a time, plus an AI content pipeline that writes, attacks, and bias-checks its own question bank.

**[Try it on your phone →](LIVE_DEMO_URL)** · works offline · installs to your home screen

<p align="center">
  <img src="docs/screenshots/question.png" width="250" alt="A scenario question about Promise.all with four answer options">
  &nbsp;
  <img src="docs/screenshots/answered.png" width="250" alt="An answered question: the wrong pick marked, the correct answer highlighted, and an explanation below">
  &nbsp;
  <img src="docs/screenshots/progress.png" width="250" alt="The Study Hub sheet showing per-topic progress bars">
</p>

Open it, answer, close it. No accounts, streaks or scores. Every answer comes with an explanation (scenario questions cover why each wrong option fails) and a ready-made prompt to take to an LLM for a deeper dive or a skeptical fact-check. 240 questions across JavaScript, backend engineering, and CCAF certification prep (Claude agent architecture, tool design, MCP).

## What's interesting here

**An AI pipeline that doesn't let the generator grade its own work.** Three Claude Code commands in [`.claude/commands/`](.claude/commands/) handle content. `/discuss` plans a batch against real coverage gaps. `/generate` writes each section in parallel subagents, then sends the batch to a separate adversarial reviewer, plus a web-searching fact-checker for fast-moving topics. `/merge` waits for a human skim before anything goes live. Anything that fails a check is dropped, not quietly patched.

**I measured a bias the AI reviewer missed, then fixed it in code.** The reviewed bank still gave answers away: in JavaScript, the correct option was clearly the longest 97% of the time, and in backend, answer A was correct 42% of the time. I added deterministic checks ([`scripts/check-bias.mjs`](scripts/check-bias.mjs)), assigned answer positions in code instead of trusting the model ([`scripts/rebalance-positions.mjs`](scripts/rebalance-positions.mjs)), rewrote the options, and re-ran the review. The second review also caught three errors that had been in the bank all along. Both checks now run on every new batch.

| | Before | After |
|---|---|---|
| Correct answer clearly the longest option (JavaScript) | 97% | 0% |
| Correct-answer position spread A/B/C/D (backend) | 42 / 32 / 16 / 10% | 26 / 26 / 25 / 23% |
| Explanations naming options by letter (mostly the wrong letter) | 74 | 0 |

Backend and CCAF option rewrites are next.

**Offline-first without a framework.** A hand-written service worker ([`public/sw.js`](public/sw.js), 70 lines) serves content-hashed assets from the cache and fetches the page from the network first, so new deploys land without an "update available" banner. Answering a question never touches the network.

**A small server surface, locked down.** The only endpoint is an optional progress backup to Vercel Blob. It rejects any request without a shared secret, checked in constant time. Visitors' progress never leaves their browser.

**Decisions written down, including what I didn't build.** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) is the spec and [`PLAN.md`](PLAN.md) is the build log, reversed decisions included. Spaced repetition, accounts and cross-device sync were each considered and scoped out with reasons. Sync is built and tested on the [`feature/progress-sync`](https://github.com/jessy-p/quiz-app/tree/feature/progress-sync) branch (merge-safe union of attempt events, ETag-conditional writes); it isn't merged because one person on one phone doesn't need it.

## How it was built

AI-assisted with [Claude Code](https://claude.com/claude-code), spec first: I wrote the brief and a phased plan, then built against them one phase at a time, reviewing the generated code and content as I went. The same rule shaped the content pipeline: never trust a single pass of model output.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Vercel + Vercel Blob

## Run it locally

Requires Node 20+.

```bash
git clone https://github.com/jessy-p/quiz-app.git
cd quiz-app
npm install
npm run dev
```

Open http://localhost:3000, ideally with your browser's phone emulation. No environment variables needed: progress lives in `localStorage`.

## Use your own questions

- **By hand:** add `data/questions/<topic>.json` (schema in [`types/question.ts`](types/question.ts)) and register it in [`lib/questionPool.ts`](lib/questionPool.ts).
- **With the pipeline:** in [Claude Code](https://claude.com/claude-code), run `/discuss` on any topic, then `/generate`, then `/merge`.
- Check any bank with `node scripts/check-bias.mjs`.

## Deploy your own

Import the repo into [Vercel](https://vercel.com/new). It works as is. To back up your own progress, connect a Blob store, set `BACKUP_SECRET` (e.g. `openssl rand -hex 16`), then open `/?backup=<secret>` once on your phone. See [`.env.example`](.env.example).

## Repo map

```
app/                 the one screen, PWA manifest/icons, /api/backup
components/          question card, option rows, action sheet, Study Hub
lib/                 selection, storage, progress (pure functions + two hooks)
data/questions/      the question bank, one JSON file per topic
scripts/             bias check + answer-position rebalancing
.claude/commands/    the /discuss → /generate → /merge content pipeline
public/sw.js         offline service worker
```
