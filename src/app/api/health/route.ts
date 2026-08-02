import { NextResponse } from "next/server";

export async function GET() {
  // Reports whether verification keys are configured (never the values
  // themselves) — useful for confirming Vercel env vars actually reached
  // the running deployment without guessing.
  const zeroBounceKeysConfigured = [
    process.env.ZEROBOUNCE_API_KEY,
    process.env.ZEROBOUNCE_API_KEY_2,
  ].filter(Boolean).length;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    zeroBounceKeysConfigured,
  });
}
