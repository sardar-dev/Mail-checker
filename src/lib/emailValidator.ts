import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

export interface ValidationResult {
  email: string;
  wellFormed: boolean;
  validDomain: boolean | null;
  validMailbox: boolean | null;
  mxRecords?: dns.MxRecord[];
  status: "live" | "disabled" | "unregistered" | "unknown" | "verify";
  errorMessage?: string;
}

function isWellFormed(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

function extractEmail(record: string): string {
  // Extract email from a comma-separated record
  const parts = record.split(",").map((p) => p.trim());
  for (const part of parts) {
    if (part.includes("@")) {
      return part.trim();
    }
  }
  return record.trim();
}

async function getMxRecords(domain: string): Promise<dns.MxRecord[] | null> {
  try {
    const records = await resolveMx(domain);
    if (records && records.length > 0) {
      return records.sort((a, b) => a.priority - b.priority);
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyMailboxSMTP(
  email: string,
  mxHost: string,
  timeout: number = 10000
): Promise<boolean | null> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let stage = 0;
    let resolved = false;
    const domain = email.split("@")[1];

    const cleanup = (result: boolean | null) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      cleanup(null);
    }, timeout);

    socket.setTimeout(timeout);

    socket.on("timeout", () => {
      clearTimeout(timer);
      cleanup(null);
    });

    socket.on("error", () => {
      clearTimeout(timer);
      cleanup(null);
    });

    socket.on("close", () => {
      clearTimeout(timer);
      if (!resolved) cleanup(null);
    });

    socket.on("data", (data: Buffer) => {
      const response = data.toString();
      const code = parseInt(response.substring(0, 3), 10);

      if (stage === 0) {
        // Connected - got banner
        if (code === 220) {
          stage = 1;
          socket.write(`EHLO validator.tool\r\n`);
        } else {
          clearTimeout(timer);
          cleanup(null);
        }
      } else if (stage === 1) {
        // EHLO response
        if (code === 250) {
          stage = 2;
          socket.write(`MAIL FROM:<verify@${domain}>\r\n`);
        } else if (code === 421 || code === 450 || code === 550) {
          clearTimeout(timer);
          cleanup(null);
        } else {
          // Try HELO fallback
          stage = 2;
          socket.write(`MAIL FROM:<verify@${domain}>\r\n`);
        }
      } else if (stage === 2) {
        // MAIL FROM response
        if (code === 250) {
          stage = 3;
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else {
          clearTimeout(timer);
          cleanup(null);
        }
      } else if (stage === 3) {
        // RCPT TO response - this is the key check
        clearTimeout(timer);
        if (code === 250 || code === 251) {
          // Mailbox exists
          socket.write("QUIT\r\n");
          cleanup(true);
        } else if (
          code === 550 ||
          code === 551 ||
          code === 553 ||
          code === 554 ||
          code === 450 ||
          code === 452 ||
          code === 500 ||
          code === 501 ||
          code === 503
        ) {
          // Mailbox does not exist or rejected
          socket.write("QUIT\r\n");
          cleanup(false);
        } else {
          // Unknown response
          socket.write("QUIT\r\n");
          cleanup(null);
        }
      }
    });

    socket.connect(25, mxHost);
  });
}

// Domains that don't allow SMTP verification
const CATCH_ALL_DOMAINS = new Set([
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.com.br",
  "yahoo.com.ar",
  "yahoo.com.mx",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "live.com",
  "live.co.uk",
  "msn.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);

function determineStatus(result: {
  wellFormed: boolean;
  validDomain: boolean | null;
  validMailbox: boolean | null;
}): "live" | "disabled" | "unregistered" | "unknown" | "verify" {
  if (!result.wellFormed) return "disabled";
  if (result.validDomain === false) return "unregistered";
  if (result.validDomain === null) return "unknown";
  if (result.validMailbox === null) return "verify";
  if (result.validMailbox === true) return "live";
  return "disabled";
}

export async function validateEmail(
  originalRecord: string,
  options: {
    verifyDomain?: boolean;
    verifyMailbox?: boolean;
    timeout?: number;
  } = {}
): Promise<ValidationResult> {
  const { verifyDomain = true, verifyMailbox = true, timeout = 10000 } = options;
  const email = extractEmail(originalRecord);

  const wellFormed = isWellFormed(email);
  if (!wellFormed) {
    return {
      email,
      wellFormed: false,
      validDomain: null,
      validMailbox: null,
      status: "disabled",
      errorMessage: "Invalid email format",
    };
  }

  const domain = email.split("@")[1];

  let validDomain: boolean | null = null;
  let validMailbox: boolean | null = null;
  let mxRecords: dns.MxRecord[] | undefined;

  if (verifyDomain) {
    try {
      // Check domain exists via DNS A record or MX records
      const mx = await getMxRecords(domain);
      if (mx && mx.length > 0) {
        validDomain = true;
        mxRecords = mx;
      } else {
        // Try resolving domain via A record
        const resolveA = promisify(dns.resolve4);
        try {
          await resolveA(domain);
          validDomain = true;
        } catch {
          validDomain = false;
        }
      }
    } catch {
      validDomain = false;
    }
  }

  if (verifyMailbox && validDomain !== false) {
    if (CATCH_ALL_DOMAINS.has(domain.toLowerCase())) {
      validMailbox = null; // Can't verify, return verify status
    } else if (mxRecords && mxRecords.length > 0) {
      try {
        validMailbox = await verifyMailboxSMTP(email, mxRecords[0].exchange, timeout);
      } catch {
        validMailbox = null;
      }
    } else {
      validMailbox = null;
    }
  }

  const status = determineStatus({ wellFormed, validDomain, validMailbox });

  return {
    email,
    wellFormed,
    validDomain,
    validMailbox,
    mxRecords,
    status,
  };
}

export function extractEmailFromRecord(record: string): string {
  return extractEmail(record);
}
