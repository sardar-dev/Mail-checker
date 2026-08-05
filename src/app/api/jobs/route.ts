import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { validationJobs, emailResults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    if (jobId) {
      const [job] = await db
        .select()
        .from(validationJobs)
        .where(eq(validationJobs.id, jobId));

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      let query = db.select().from(emailResults).where(eq(emailResults.jobId, jobId));

      const results = await query;

      const filtered = status
        ? results.filter((r) => r.status === status)
        : results;

      return NextResponse.json({ job, results: filtered });
    }

    // List recent jobs
    const jobs = await db
      .select()
      .from(validationJobs)
      .orderBy(desc(validationJobs.createdAt))
      .limit(20);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
