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

const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "live.com",
  "msn.com",
  "protonmail.com",
];

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

/**
 * Suggests a likely-intended domain when the given one looks like a typo
 * of a well-known provider (e.g. "gmial.com" -> "gmail.com"). Returns null
 * when the domain is already a known provider or too different to guess.
 */
export function suggestDomainTypo(domain: string): string | null {
  const lower = domain.toLowerCase();
  if (COMMON_DOMAINS.includes(lower)) return null;

  let best: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of COMMON_DOMAINS) {
    const distance = levenshteinDistance(lower, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  // Only suggest for close-but-not-exact matches — a distance of 1-2
  // catches typos (dropped/swapped/wrong letter) without false-flagging
  // legitimately different domains.
  if (best && bestDistance > 0 && bestDistance <= 2) return best;
  return null;
}

/**
 * A mailbox is only labelled live or not-exist when SMTP returned a
 * definitive recipient result. Timeouts, blocked SMTP, catch-all domains,
 * and Gmail all remain unknown rather than being presented as live.
 */
export function determineStatus(data: {
  wellFormed: boolean;
  validDomain: boolean;
  validMailbox: boolean | null;
}): EmailStatus {
  if (!data.wellFormed || !data.validDomain) return "invalid";
  if (data.validMailbox === true) return "live";
  if (data.validMailbox === false) return "not_exist";
  return "unknown";
}

export function calculateScore(data: {
  status: EmailStatus;
  gmail: boolean;
  disposable: boolean;
  roleAccount: boolean;
  catchAll: boolean;
}): number {
  let score = 0;

  if (data.status === "live") score += data.catchAll ? 35 : 60;
  else if (data.status === "unknown") score += 30;
  else return 0;

  if (data.gmail) score += 15;
  if (!data.disposable) score += 15;
  if (!data.roleAccount) score += 10;

  return Math.min(100, Math.max(0, score));
}

export function calculateConfidence(data: {
  status: EmailStatus;
  gmail: boolean;
  catchAll: boolean;
}): number {
  let confidence = 0;

  if (data.status === "live") confidence += data.catchAll ? 25 : 60;
  else if (data.status === "unknown") confidence += 30;
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
  catchAll: boolean;
}): string {
  if (!data.wellFormed) return "Invalid email syntax";
  if (!data.validDomain) return "Domain does not exist or has no MX records";
  if (data.disposable) return "Disposable email address detected";
  if (data.roleAccount) return "Role-based email address";

  if (data.status === "not_exist") {
    return "Mail server rejected this mailbox";
  }

  if (data.status === "live" && data.catchAll) {
    return "Domain accepts all addresses (catch-all) — this specific mailbox could not be individually confirmed";
  }

  if (data.status === "live") {
    return "Mail server accepted this mailbox";
  }

  if (data.status === "unknown") {
    if (data.gmail) {
      return "Gmail mailbox status cannot be confirmed through SMTP";
    }
    return "Mailbox status could not be confirmed";
  }

  return "Invalid email";
}

export function buildResult(
  email: string,
  smtpResult: {
    wellFormed: boolean;
    validDomain: boolean;
    validMailbox: boolean | null;
  },
  catchAll = false
): ValidationResult {
  const domain = email.includes("@") ? email.split("@")[1] ?? "" : "";
  const gmail = isGmailDomain(domain);
  const provider = detectProvider(domain);
  const disposable = isDisposable(domain);
  const roleAccount = isRoleAccount(email);
  const typoSuggestion = smtpResult.wellFormed
    ? suggestDomainTypo(domain)
    : null;

  const status = determineStatus(smtpResult);
  const valid = status === "live" && !catchAll;
  const syntax = smtpResult.wellFormed;
  const domainValid = smtpResult.validDomain;
  const mx = smtpResult.validDomain;
  const mailbox = smtpResult.validMailbox;

  const score = calculateScore({ status, gmail, disposable, roleAccount, catchAll });
  const confidence = calculateConfidence({ status, gmail, catchAll });
  const reason = generateReason({
    status,
    gmail,
    wellFormed: smtpResult.wellFormed,
    validDomain: smtpResult.validDomain,
    validMailbox: smtpResult.validMailbox,
    disposable,
    roleAccount,
    catchAll,
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
    catchAll,
    typoSuggestion,
    score,
    confidence,
    reason,
  };
}
