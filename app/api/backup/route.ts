import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createHash, timingSafeEqual } from "node:crypto";

// Matches crypto.randomUUID() output — see lib/deviceToken.ts.
const DEVICE_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Generous sanity backstop, not a real-world limit — see PROJECT_BRIEF.md's
// note that thousands of attempts is still a small payload.
const MAX_ATTEMPTS = 50_000;

interface Attempt {
  questionId: string;
  correct: boolean;
  timestamp: number;
}

function isValidAttempt(value: unknown): value is Attempt {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Attempt).questionId === "string" &&
    typeof (value as Attempt).correct === "boolean" &&
    typeof (value as Attempt).timestamp === "number"
  );
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time check of the Bearer secret against BACKUP_SECRET. */
function isAuthorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  return provided.length > 0 && timingSafeEqual(digest(provided), digest(secret));
}

// Passive backup destination only — see PROJECT_BRIEF.md's State & storage.
// Overwrites the same path each call (full-snapshot transport, not a diff)
// and never returns the blob URL to the client.
//
// Locked to the owner's devices: every request must carry BACKUP_SECRET as
// a Bearer token, so nobody else (public visitors, anyone reading this
// code) can write to the store. With BACKUP_SECRET unset, backup is off.
export async function POST(request: NextRequest) {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "backup not configured" }, { status: 404 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { token, attempts } = body as { token?: unknown; attempts?: unknown };

  if (typeof token !== "string" || !DEVICE_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  if (
    !Array.isArray(attempts) ||
    attempts.length > MAX_ATTEMPTS ||
    !attempts.every(isValidAttempt)
  ) {
    return NextResponse.json({ error: "invalid attempts" }, { status: 400 });
  }

  await put(`attempts/${token}.json`, JSON.stringify(attempts), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return NextResponse.json({ ok: true });
}
