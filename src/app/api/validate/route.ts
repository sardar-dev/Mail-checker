import { NextRequest, NextResponse } from "next/server";
import EmailValidator from "@/lib/email-validator";
import { buildResult } from "@/lib/validators";
import { rateLimit } from "@/utils/rate-limit";
import { sanitizeInput } from "@/utils/helpers";
import { dnsCache, emailCache } from "@/lib/cache";
import type { ValidationResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const emailValidator = new EmailValidator({
  timeout: 10000,
  verifyDomain: true,
  verifyMailbox: true,
});

// Concurrency limiter — max N simultaneous SMTP verifications
const MAX_CONCURRENT = 10;
let activeRequests = 0;

// Maximum request body size (10KB)
const MAX_BODY_SIZE = 10 * 1024;

// Maximum emails per request
const MAX_EMAILS = 70;

// Request timeout (55 seconds — stays under the 60s function limit above)
const REQUEST_TIMEOUT_MS = 55_000;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success, remaining } = rateLimit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": "0" },
      }
    );
  }

  // Concurrency check
  if (activeRequests >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: "Server is busy. Please try again in a moment." },
      { status: 503 }
    );
  }

  activeRequests++;

  try {
    // Request body size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request body too large." },
        { status: 413 }
      );
    }

    // Request timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS);
    });

    const handleRequest = async () => {
      const body = await request.json();
      const { emails } = body as { emails?: string[] };

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return NextResponse.json(
          { error: "Please provide an array of emails." },
          { status: 400 }
        );
      }

      if (emails.length > MAX_EMAILS) {
        return NextResponse.json(
          { error: "Maximum 70 email addresses allowed." },
          { status: 400 }
        );
      }

      const sanitizedEmails = emails.map((e) => sanitizeInput(e.toLowerCase()));

      const checkOneEmail = async (
        email: string
      ): Promise<ValidationResult> => {
        // Check email cache first
        const cached = emailCache.get(email);
        if (cached) {
          return buildResult(email, cached);
        }

        // Check DNS cache for the domain
        const domain = email.includes("@") ? email.split("@")[1] ?? "" : "";
        const cachedDns = domain ? dnsCache.get(domain) : null;

        let verification: {
          wellFormed: boolean;
          validDomain: boolean;
          validMailbox: boolean | null;
        };

        if (cachedDns && !cachedDns.domainValid) {
          // Domain already known to be invalid — skip SMTP
          verification = {
            wellFormed: true,
            validDomain: false,
            validMailbox: null,
          };
        } else {
          try {
            const raw = await emailValidator.verify(email);
            verification = {
              wellFormed: raw.wellFormed ?? false,
              validDomain: raw.validDomain ?? false,
              validMailbox: raw.validMailbox ?? null,
            };

            // Cache the DNS result for this domain
            if (domain && verification.validDomain !== undefined) {
              dnsCache.set(domain, {
                mxFound: verification.validDomain,
                domainValid: verification.validDomain,
              });
            }
          } catch {
            verification = {
              wellFormed: false,
              validDomain: false,
              validMailbox: null,
            };
          }
        }

        // Cache the full email result
        emailCache.set(email, verification);
        return buildResult(email, verification);
      };

      // Check emails one at a time, sequentially, as requested — note
      // this means a batch of N emails can take up to N * 10s, so large
      // batches are more likely to hit the request timeout below.
      const results: ValidationResult[] = [];
      for (const email of sanitizedEmails) {
        results.push(await checkOneEmail(email));
      }

      return NextResponse.json(
        { results },
        {
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "Cache-Control": "no-store",
          },
        }
      );
    };

    return await Promise.race([handleRequest(), timeoutPromise]);
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Request timeout"
        ? "Request timed out. Please try with fewer emails."
        : "Invalid request body.";

    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    activeRequests--;
  }
}
