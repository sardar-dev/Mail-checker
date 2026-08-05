import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { validationJobs, emailResults } from "@/db/schema";
import { validateEmail } from "@/lib/emailValidator";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      emails,
      timeout = 10000,
    }: {
      emails: string[];
      timeout?: number;
    } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });
    }

    if (emails.length > 5000) {
      return NextResponse.json(
        { error: "Maximum 5000 emails per request" },
        { status: 400 }
      );
    }

    // Create job
    const [job] = await db
      .insert(validationJobs)
      .values({
        totalEmails: emails.length,
        processedEmails: 0,
        status: "running",
        source: "manual",
      })
      .returning();

    // Process emails concurrently in batches
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((record: string) =>
          validateEmail(record, { verifyDomain: true, verifyMailbox: true, timeout })
        )
      );
      results.push(...batchResults);

      // Update progress
      await db
        .update(validationJobs)
        .set({
          processedEmails: Math.min(i + BATCH_SIZE, emails.length),
          updatedAt: new Date(),
        })
        .where(eq(validationJobs.id, job.id));
    }

    // Save results
    if (results.length > 0) {
      const emailRecords = results.map((r, idx) => ({
        jobId: job.id,
        email: r.email,
        originalRecord: emails[idx],
        status: r.status,
        wellFormed: r.wellFormed ? 1 : 0,
        validDomain: r.validDomain === null ? null : r.validDomain ? 1 : 0,
        validMailbox: r.validMailbox === null ? null : r.validMailbox ? 1 : 0,
        mxRecords: r.mxRecords ?? null,
        errorMessage: r.errorMessage ?? null,
      }));

      await db.insert(emailResults).values(emailRecords);
    }

    // Update job as completed
    await db
      .update(validationJobs)
      .set({
        status: "completed",
        processedEmails: emails.length,
        updatedAt: new Date(),
      })
      .where(eq(validationJobs.id, job.id));

    // Count by status
    const counts = {
      total: results.length,
      live: results.filter((r) => r.status === "live").length,
      disabled: results.filter((r) => r.status === "disabled").length,
      unregistered: results.filter((r) => r.status === "unregistered").length,
      unknown: results.filter((r) => r.status === "unknown").length,
      verify: results.filter((r) => r.status === "verify").length,
    };

    return NextResponse.json({
      jobId: job.id,
      counts,
      results: results.map((r, idx) => ({
        email: r.email,
        originalRecord: emails[idx],
        status: r.status,
        wellFormed: r.wellFormed,
        validDomain: r.validDomain,
        validMailbox: r.validMailbox,
      })),
    });
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Internal server error during validation" },
      { status: 500 }
    );
  }
}
