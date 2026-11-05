// Shared read/write for data/questions/*.json. Writes each file back in its
// own existing on-disk style (2-space indent; non-ASCII escaped as \uXXXX or
// left raw; trailing newline or not — the files differ by how they were
// produced) so scripted edits yield minimal, reviewable diffs.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const QUESTIONS_DIR = path.join(process.cwd(), "data", "questions");

export function questionFiles(dir = QUESTIONS_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(dir, f));
}

export function readQuestions(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeQuestions(file, questions) {
  const original = readFileSync(file, "utf8");
  const escapeNonAscii = !/[^\x00-\x7f]/.test(original);
  let json = JSON.stringify(questions, null, 2);
  if (escapeNonAscii) {
    json = json.replace(
      /[\u007f-￿]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
  }
  if (original.endsWith("\n")) json += "\n";
  writeFileSync(file, json);
}
