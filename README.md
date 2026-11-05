# Study Loop

A phone-first study app: one question at a time instead of scrolling. Its question bank is written and checked by an AI pipeline that doesn't trust its own output.

**[Try it on your phone →](LIVE_DEMO_URL)** · works offline · installable

<p align="center">
  <img src="docs/screenshots/question.png" width="250" alt="A scenario question about Promise.all with four answer options">
  &nbsp;
  <img src="docs/screenshots/answered.png" width="250" alt="An answered question: wrong pick marked, correct answer highlighted, explanation below">
  &nbsp;
  <img src="docs/screenshots/progress.png" width="250" alt="Study Hub showing per-topic progress bars">
</p>

240 questions on JavaScript, backend engineering and CCAF certification prep. Every answer is explained, with a ready-made prompt to take to an LLM for more. No accounts, streaks or scores.

## Highlights

- **The generator never grades itself.** Three Claude Code commands ([`.claude/commands/`](.claude/commands/)) run the content pipeline: `/discuss` plans a batch, `/generate` writes it in parallel subagents and has a separate reviewer try to break it (plus a fact-checker for fast-moving topics), and `/merge` waits for a human sign-off.
- **A bias the AI reviewer missed, fixed in code.** In JavaScript, the correct answer was clearly the longest option 97% of the time; in backend, it was "A" 42% of the time. Deterministic checks ([`scripts/check-bias.mjs`](scripts/check-bias.mjs)) now run on every batch, and answer positions are assigned in code. The re-review also caught three errors that had been in the bank all along.
- **Offline-first.** A hand-written, 70-line service worker ([`public/sw.js`](public/sw.js)). Answering never touches the network.
- **One endpoint, locked.** The optional progress backup (Vercel Blob) requires a shared secret. Visitors' progress never leaves their browser.
- **Decisions on paper.** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) (spec) and [`PLAN.md`](PLAN.md) (build log), including what was deliberately left out and why.

| Answer-bias fix | Before | After |
|---|---|---|
| Correct answer clearly the longest (JavaScript) | 97% | 0% |
| Correct-answer position A/B/C/D (backend) | 42 / 32 / 16 / 10% | 26 / 26 / 25 / 23% |
| Explanations citing options by letter, mostly the wrong one | 74 | 0 |

Backend and CCAF option rewrites are next.

Built spec-first with [Claude Code](https://claude.com/claude-code), reviewing generated code and content against the spec.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Vercel + Blob

## Run locally

```bash
git clone https://github.com/jessy-p/quiz-app.git
cd quiz-app
npm install
npm run dev
```

Node 20+. No environment variables needed: progress lives in `localStorage`.

## Make it yours

- **Questions:** add `data/questions/<topic>.json` (schema in [`types/question.ts`](types/question.ts)) and register it in [`lib/questionPool.ts`](lib/questionPool.ts), or generate a set with `/discuss`, `/generate` and `/merge` in Claude Code.
- **Deploy:** import the repo into [Vercel](https://vercel.com/new). For the optional backup, see [`.env.example`](.env.example).
