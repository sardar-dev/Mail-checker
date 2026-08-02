import { NextRequest, NextResponse } from "next/server";
import { buildResult } from "@/lib/validators";
import { rateLimit } from "@/utils/rate-limit";
import { sanitizeInput } from "@/utils/helpers";
import { dnsCache, emailCache } from "@/lib/cache";
import type { ValidationResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Real mailbox verification requires an SMTP (port 25) handshake with the
// recipient's mail server. Every cloud/serverless host (Vercel/AWS,
// Cloudflare, GCP) blocks outbound port 25 by default as an anti-spam
// measure, so that check can never succeed from here directly. Instead we
// delegate it to ZeroBounce's Email Validation API, which performs the
// SMTP check on its own whitelisted infrastructure.
// https://www.zerobounce.net/apis/email-validation-api
//
// Supports multiple keys (ZEROBOUNCE_API_KEY, ZEROBOUNCE_API_KEY_2, ...)
// so several free-tier accounts can be combined for more monthly quota.
// When a key's quota runs out, requests using it fail — on any failure
// we fall through to the next key automatically.
const ZEROBOUNCE_API_KEYS = [
  process.env.ZEROBOUNCE_API_KEY,
  process.env.ZEROBOUNCE_API_KEY_2,
].filter((key): key is string => Boolean(key));
const ZEROBOUNCE_API_URL = "https://api.zerobounce.net/v2/validate";

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
          // Domain already known to be invalid — skip the API call
          verification = {
            wellFormed: true,
            validDomain: false,
            validMailbox: null,
          };
        } else if (ZEROBOUNCE_API_KEYS.length === 0) {
          // No API key configured — fall back to syntax-only checking
          // rather than silently reporting everything as "good".
          verification = {
            wellFormed: true,
            validDomain: false,
            validMailbox: null,
          };
        } else {
          verification = {
            wellFormed: true,
            validDomain: false,
            validMailbox: null,
          };

          for (const apiKey of ZEROBOUNCE_API_KEYS) {
            try {
              const apiUrl = `${ZEROBOUNCE_API_URL}?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
              const apiResponse = await fetch(apiUrl, {
                signal: AbortSignal.timeout(15000),
              });

              if (!apiResponse.ok) {
                // Likely an exhausted/invalid key — try the next one.
                continue;
              }

              const apiData = await apiResponse.json();

              // ZeroBounce error responses come back as 200 OK with an
              // "error" field (e.g. invalid/exhausted key) instead of a
              // non-2xx status — treat that the same as a failed call.
              if (apiData?.error) {
                continue;
              }

              const status = apiData?.status as
                | "valid"
                | "invalid"
                | "catch-all"
                | "unknown"
                | "spamtrap"
                | "abuse"
                | "do_not_mail"
                | undefined;

              const mxFound =
                apiData?.mx_found === true || apiData?.mx_found === "true";

              // Map ZeroBounce's richer status set onto our simpler
              // wellFormed/validDomain/validMailbox shape.
              const wellFormed = status !== "invalid" || mxFound;
              const validMailbox =
                status === "valid"
                  ? true
                  : status === "invalid"
                    ? false
                    : null; // catch-all/unknown/spamtrap/abuse/do_not_mail: can't say for sure

              verification = {
                wellFormed,
                validDomain: mxFound,
                validMailbox,
              };

              if (domain) {
                dnsCache.set(domain, {
                  mxFound,
                  domainValid: mxFound,
                });
              }

              // Got a usable result — no need to try remaining keys.
              break;
            } catch {
              // This key/request failed — try the next key, if any.
              continue;
            }
          }
        }

        // Cache the full email result
        emailCache.set(email, verification);
        return buildResult(email, verification);
      };

      // Run all emails in this batch concurrently instead of one at a
      // time — sequential checks could take up to 10s EACH, easily
      // blowing past the request/function time limit for a 5-email batch.
      const results: ValidationResult[] = await Promise.all(
        sanitizedEmails.map(checkOneEmail)
      );

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
