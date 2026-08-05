import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailResults } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status"); // filter by status
    const format = searchParams.get("format") || "csv"; // csv or txt
    const outputMode = searchParams.get("outputMode") || "mail_status"; // mail_status or account_status

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    let results = await db
      .select()
      .from(emailResults)
      .where(eq(emailResults.jobId, jobId));

    if (status) {
      results = results.filter((r) => r.status === status);
    }

    if (format === "csv") {
      const headers = ["email", "original_record", "status", "well_formed", "valid_domain", "valid_mailbox"];
      const rows = results.map((r) => [
        r.email,
        r.originalRecord,
        r.status,
        r.wellFormed === 1 ? "true" : "false",
        r.validDomain === null ? "unknown" : r.validDomain === 1 ? "true" : "false",
        r.validMailbox === null ? "unknown" : r.validMailbox === 1 ? "true" : "false",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="email-validation-${jobId}.csv"`,
        },
      });
    } else {
      // Text format: email|STATUS or account|STATUS
      const lines = results.map((r) => {
        const statusLabel = r.status.toUpperCase();
        if (outputMode === "account_status") {
          const account = r.email.split("@")[0];
          return `${account}|${statusLabel}`;
        }
        return `${r.email}|${statusLabel}`;
      });

      const txt = lines.join("\n");

      return new NextResponse(txt, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="email-validation-${jobId}.txt"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
