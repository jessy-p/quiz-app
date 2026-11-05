#!/usr/bin/env node
// Claude Code PostToolUse hook: re-run the bias check whenever Claude
// changes question content, so the pipeline's rules are enforced by the
// harness rather than by Claude remembering an instruction.
//
// Fires on:
//   - Write/Edit/MultiEdit of data/questions/*.json or data/_staging/*.json
//     → checks that file
//   - a Bash command that mentions those paths (scripted edits, e.g. the
//     rebalance script) → checks every live topic file plus any staged batch
//
// Hard failures (an explanation citing "Option B", invalid JSON) exit 2,
// which Claude Code reports back to Claude as a blocking error to fix.
// Warnings (length/wording cues) are passed back as context only.
// Registered in .claude/settings.json.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const QUESTION_FILE = /data\/(questions|_staging)\/[^/]+\.json$/;

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // not our business if the payload is unreadable
}

const tool = input.tool_name;
let files = [];
if (tool === "Bash") {
  const command = input.tool_input?.command ?? "";
  if (!/data\/(questions|_staging)|questionFile|rebalance-positions/.test(command)) process.exit(0);
  for (const dir of ["data/questions", "data/_staging"]) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (f.endsWith(".json")) files.push(path.join(abs, f));
  }
} else {
  const file = input.tool_input?.file_path ?? input.tool_response?.filePath ?? "";
  if (!QUESTION_FILE.test(file)) process.exit(0);
  files = [file];
}
if (files.length === 0) process.exit(0);

// Invalid JSON is a hard failure on its own: check-bias would crash on it.
for (const f of files) {
  try {
    JSON.parse(readFileSync(f, "utf8"));
  } catch (error) {
    console.error(`Question file is not valid JSON: ${path.relative(ROOT, f)}\n${error.message}`);
    process.exit(2);
  }
}

const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/check-bias.mjs"), "--list", ...files], {
  cwd: ROOT,
  encoding: "utf8",
});
const report = (result.stdout + result.stderr).trim();

if (result.status !== 0) {
  console.error(`Bias check failed — fix these before continuing:\n${report}`);
  process.exit(2);
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `Bias check passed (hard checks). Warnings to weigh:\n${report}`,
    },
  }),
);
