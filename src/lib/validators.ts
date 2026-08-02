import type { ValidationResult, EmailStatus } from "@/types";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "jetable.org",
  "jetable.fr",
  "tempmail.com",
  "tempmail.org",
  "throwaway.email",
  "dispostable.com",
  "trashmail.com",
  "trashmail.io",
  "maildrop.cc",
  "mailnesia.com",
  "tempail.com",
  "10minutemail.com",
  "minuteinbox.com",
  "tempinbox.com",
  "mohmal.com",
  "burnermail.io",
  "temp-mail.org",
  "tempmailaddress.com",
]);

const ROLE_ACCOUNTS = new Set([
  "admin",
  "administrator",
  "info",
  "postmaster",
  "webmaster",
  "hostmaster",
  "abuse",
  "noreply",
  "no-reply",
  "support",
  "help",
  "contact",
  "sales",
  "marketing",
  "root",
  "mailer-daemon",
  "mailerdaemon",
  "nobody",
  "operator",
  "system",
  "news",
  "usenet",
  "security",
  "dns",
  "dns-admin",
  "ftp",
  "www",
  "web",
  "webadmin",
]);

const KNOWN_PROVIDERS: Record<string, string> = {
  "gmail.com": "Google",
  "googlemail.com": "Google",
  "outlook.com": "Microsoft",
  "hotmail.com": "Microsoft",
  "live.com": "Microsoft",
  "msn.com": "Microsoft",
  "yahoo.com": "Yahoo",
  "yahoo.co.in": "Yahoo",
  "yahoo.co.uk": "Yahoo",
  "ymail.com": "Yahoo",
  "rocketmail.com": "Yahoo",
  "icloud.com": "Apple",
  "me.com": "Apple",
  "mac.com": "Apple",
  "aol.com": "AOL",
  "protonmail.com": "ProtonMail",
  "proton.me": "ProtonMail",
  "pm.me": "ProtonMail",
  "zoho.com": "Zoho",
  "mail.com": "Mail.com",
  "gmx.com": "GMX",
  "gmx.net": "GMX",
  "yandex.com": "Yandex",
  "yandex.ru": "Yandex",
  "tutanota.com": "Tutanota",
  "tuta.io": "Tutanota",
  "fastmail.com": "Fastmail",
  "hey.com": "HEY",
};

export function validateSyntax(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isGmailDomain(domain: string): boolean {
  return GMAIL_DOMAINS.includes(domain.toLowerCase());
}

export function detectProvider(domain: string): string {
  return KNOWN_PROVIDERS[domain.toLowerCase()] || "Unknown";
}

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

export function isRoleAccount(email: string): boolean {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  return ROLE_ACCOUNTS.has(localPart);
}

/**
 * Status mapping:
 *   - "good"     → SMTP confirmed mailbox exists, or domain valid but can't verify (email looks good)
 *   - "verified" → SMTP confirmed mailbox does NOT exist (verification completed, mailbox non-existent)
 *   - "invalid"  → Syntax error or domain does not exist
 */
export function determineStatus(data: {
  wellFormed: boolean;
  validDomain: boolean;
  validMailbox: boolean | null;
}): EmailStatus {
  // Invalid: syntax or domain problems
  if (!data.wellFormed) return "invalid";
  if (!data.validDomain) return "invalid";

  // Verified: SMTP confirmed the mailbox does NOT exist
  if (data.validMailbox === false) return "verified";

  // Good: SMTP confirmed mailbox exists, or couldn't verify (email looks good)
  return "good";
}

export function calculateScore(data: {
  status: EmailStatus;
  gmail: boolean;
  disposable: boolean;
  roleAccount: boolean;
}): number {
  let score = 0;

  if (data.status === "good") score += 60;
  else if (data.status === "verified") score += 30;
  else return 0;

  if (data.gmail) score += 15;
  if (!data.disposable) score += 15;
  if (!data.roleAccount) score += 10;

  return Math.min(100, Math.max(0, score));
}

export function calculateConfidence(data: {
  status: EmailStatus;
  gmail: boolean;
}): number {
  let confidence = 0;

  if (data.status === "good") confidence += 60;
  else if (data.status === "verified") confidence += 30;
  else return 0;

  if (data.gmail) confidence += 20;

  return Math.min(100, Math.max(0, confidence));
}

export function generateReason(data: {
  status: EmailStatus;
  gmail: boolean;
  wellFormed: boolean;
  validDomain: boolean;
  validMailbox: boolean | null;
  disposable: boolean;
  roleAccount: boolean;
}): string {
  if (!data.wellFormed) return "Invalid email syntax";
  if (!data.validDomain) return "Domain does not exist or has no MX records";
  if (data.disposable) return "Disposable email address detected";
  if (data.roleAccount) return "Role-based email address";

  if (data.status === "verified") {
    // Mailbox confirmed non-existent
    if (data.gmail) return "Gmail address verified — mailbox does not exist";
    return "Email verified — mailbox does not exist";
  }

  if (data.status === "good") {
    if (data.validMailbox === true) {
      if (data.gmail) return "Valid Gmail Address";
      return "Valid Email Address";
    }
    // validMailbox === null (couldn't verify)
    if (data.gmail) return "Valid Gmail Address (unverified)";
    return "Valid Email Address (unverified)";
  }

  return "Invalid email";
}

export function buildResult(
  email: string,
  smtpResult: {
    wellFormed: boolean;
    validDomain: boolean;
    validMailbox: boolean | null;
  }
): ValidationResult {
  const domain = email.includes("@") ? email.split("@")[1] ?? "" : "";
  const gmail = isGmailDomain(domain);
  const provider = detectProvider(domain);
  const disposable = isDisposable(domain);
  const roleAccount = isRoleAccount(email);

  const status = determineStatus(smtpResult);
  const valid = status === "good";
  const syntax = smtpResult.wellFormed;
  const domainValid = smtpResult.validDomain;
  const mx = smtpResult.validDomain;
  const mailbox = smtpResult.validMailbox;

  const score = calculateScore({ status, gmail, disposable, roleAccount });
  const confidence = calculateConfidence({ status, gmail });
  const reason = generateReason({
    status,
    gmail,
    wellFormed: smtpResult.wellFormed,
    validDomain: smtpResult.validDomain,
    validMailbox: smtpResult.validMailbox,
    disposable,
    roleAccount,
  });

  return {
    email,
    status,
    valid,
    gmail,
    mx,
    syntax,
    domain: domainValid,
    mailbox,
    provider,
    disposable,
    roleAccount,
    score,
    confidence,
    reason,
  };
}
