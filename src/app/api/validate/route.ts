import { NextRequest, NextResponse } from "next/server";
import EmailValidator from "email-deep-validator";
import { buildResult } from "@/lib/validators";
import { rateLimit } from "@/utils/rate-limit";
import { sanitizeInput } from "@/utils/helpers";
import { dnsCache, emailCache, catchAllCache } from "@/lib/cache";
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
const MAX_EMAILS = 100;

// Request timeout (55 seconds — stays under the 60s function limit above)
const REQUEST_TIMEOUT_MS = 55_000;

// Checks whether a domain accepts mail for ANY address (catch-all) by
// probing a clearly-fake, randomized mailbox. If the mail server accepts
// that too, a "live" result for a real address on this domain doesn't
// actually confirm the specific mailbox exists — cached per domain since
// it's a domain-level property, not per-email.
async function checkCatchAll(domain: string): Promise<boolean> {
  const cached = catchAllCache.get(domain);
  if (cached !== undefined) return cached;

  const probeLocalPart = `not-a-real-mailbox-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  try {
    const raw = await emailValidator.verify(`${probeLocalPart}@${domain}`);
    const isCatchAll = raw?.validMailbox === true;
    catchAllCache.set(domain, isCatchAll);
    return isCatchAll;
  } catch {
    // Couldn't determine — don't assume catch-all, just don't cache it
    // either so a future check can try again.
    return false;
  }
}

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
          { error: "Maximum 100 email addresses allowed." },
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
          return buildResult(email, cached, cached.catchAll);
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
          // Retry once: a single failed/timed-out attempt (transient
          // network hiccup, greylisting, etc.) shouldn't be treated as
          // final — one retry meaningfully improves accuracy for cheap.
          let raw: {
            wellFormed?: boolean;
            validDomain?: boolean;
            validMailbox?: boolean | null;
          } | null = null;

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              raw = await emailValidator.verify(email);
            } catch {
              raw = null;
            }

            // A definitive answer (mailbox confirmed live/dead, or the
            // domain itself is invalid) doesn't need a second attempt.
            // Only retry when the result was inconclusive (null mailbox
            // status on an otherwise-valid domain) or the call failed.
            const inconclusive =
              !raw || (raw.validDomain && raw.validMailbox === null);
            if (!inconclusive) break;
          }

          verification = {
            wellFormed: raw?.wellFormed ?? false,
            validDomain: raw?.validDomain ?? false,
            validMailbox: raw?.validMailbox ?? null,
          };

          // Cache the DNS result for this domain
          if (domain && verification.validDomain !== undefined) {
            dnsCache.set(domain, {
              mxFound: verification.validDomain,
              domainValid: verification.validDomain,
            });
          }
        }

        // Only worth checking catch-all when the mailbox looked live —
        // it's the case where the distinction actually matters.
        const catchAll =
          verification.validMailbox === true && domain
            ? await checkCatchAll(domain)
            : false;

        // Cache the full email result
        emailCache.set(email, { ...verification, catchAll });
        return buildResult(email, verification, catchAll);
      };

      // Validate each email in order so SMTP checks run one at a time.
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
