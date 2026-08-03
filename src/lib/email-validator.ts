import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export interface EmailValidatorOptions {
  timeout?: number;
  verifyDomain?: boolean;
  verifyMailbox?: boolean;
}

export interface VerifyResult {
  wellFormed: boolean;
  validDomain: boolean;
  validMailbox: boolean | null;
}

export default class EmailValidator {
  private timeout: number;
  private verifyDomainOpt: boolean;
  private verifyMailboxOpt: boolean;

  constructor(options: EmailValidatorOptions = {}) {
    this.timeout = options.timeout ?? 10000;
    this.verifyDomainOpt = options.verifyDomain ?? true;
    this.verifyMailboxOpt = options.verifyMailbox ?? true;
  }

  public async verify(address: string): Promise<VerifyResult> {
    const result: VerifyResult = {
      wellFormed: false,
      validDomain: false,
      validMailbox: null,
    };
    const parsedAddress = EmailValidator.parseAddress(address);

    if (!parsedAddress) {
      return result;
    }

    const { local, domain } = parsedAddress;
    result.wellFormed = true;

    if (!this.verifyDomainOpt && !this.verifyMailboxOpt) {
      return result;
    }

    let mxRecords: string[] = [];
    try {
      const records = await resolveMx(domain);
      records.sort((a, b) => a.priority - b.priority);
      // A single MX record of "." is an RFC 7505 null MX: the domain
      // explicitly does not accept email.
      mxRecords = records
        .map((record) => record.exchange.replace(/\.$/, "").toLowerCase())
        .filter((exchange) => exchange.length > 0);
    } catch {
      // A DNS failure makes the domain check fail below. Mailbox probing is
      // deliberately skipped because there is no destination host to contact.
    }

    result.validDomain = mxRecords.length > 0;

    if (this.verifyMailboxOpt && result.validDomain) {
      // Gmail deliberately does not provide a dependable recipient-existence
      // signal over SMTP. Treating a 250 response as "live" would create false
      // positives, so keep the mailbox result unknown for Gmail addresses.
      if (!GMAIL_DOMAINS.has(domain)) {
        result.validMailbox = await EmailValidator.verifyMailbox(
          local,
          domain,
          mxRecords,
          this.timeout
        );
      }
    }

    return result;
  }

  private static parseAddress(address: string): { local: string; domain: string } | null {
    if (address.length === 0 || address.length > 254 || /[\s<>()[\]\\,;:"']/u.test(address)) {
      return null;
    }

    const atIndex = address.lastIndexOf("@");
    if (atIndex <= 0 || atIndex !== address.indexOf("@") || atIndex === address.length - 1) {
      return null;
    }

    const local = address.slice(0, atIndex);
    const domain = address.slice(atIndex + 1).toLowerCase();

    if (
      local.length > 64 ||
      local.startsWith(".") ||
      local.endsWith(".") ||
      local.includes("..") ||
      domain.length > 253 ||
      domain.startsWith(".") ||
      domain.endsWith(".") ||
      domain.includes("..")
    ) {
      return null;
    }

    const labels = domain.split(".");
    if (
      labels.some(
        (label) =>
          label.length === 0 ||
          label.length > 63 ||
          label.startsWith("-") ||
          label.endsWith("-") ||
          !/^[a-z0-9-]+$/i.test(label)
      )
    ) {
      return null;
    }

    return { local, domain };
  }

  private static isInvalidMailboxError(smtpReply: string): boolean {
    return (
      /^(510|511|513|550|551|553)\b/m.test(smtpReply) &&
      !/(junk|spam|openspf|spoofing|host|rbl.+blocked)/i.test(smtpReply)
    );
  }

  private static async verifyMailbox(
    local: string,
    domain: string,
    mxRecords: string[],
    timeoutMs: number
  ): Promise<boolean | null> {
    const deadline = Date.now() + timeoutMs;

    // Try MX hosts in priority order. A failed primary host should not turn a
    // mailbox into a false negative when a backup MX is reachable.
    for (const mxRecord of mxRecords) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;

      const result = await EmailValidator.verifyMailboxAtHost(
        local,
        domain,
        mxRecord,
        remainingMs
      );

      if (result !== null) return result;
    }

    return null;
  }

  private static verifyMailboxAtHost(
    local: string,
    domain: string,
    mxRecord: string,
    timeoutMs: number
  ): Promise<boolean | null> {
    return new Promise((resolve) => {
      const socket = net.connect(25, mxRecord);
      let responseTimeout: NodeJS.Timeout | undefined;
      let resolved = false;
      let buffer = "";
      const messages = [
        `EHLO ${domain}`,
        `MAIL FROM: <postmaster@${domain}>`,
        `RCPT TO: <${local}@${domain}>`,
      ];

      const finish = (result: boolean | null) => {
        if (resolved) return;
        resolved = true;

        if (responseTimeout) clearTimeout(responseTimeout);
        if (!socket.destroyed) {
          socket.write("QUIT\r\n");
          socket.end();
        }
        resolve(result);
      };

      socket.on("data", (data) => {
        buffer += data.toString();
        if (!buffer.endsWith("\n")) return;

        const lines = buffer
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const lastLine = lines.at(-1);
        const match = lastLine?.match(/^(\d{3})([ -])/);

        // Keep waiting until the final line of a multiline SMTP response.
        if (!match) return;

        const responseBlock = buffer;
        buffer = "";

        if (EmailValidator.isInvalidMailboxError(responseBlock)) {
          finish(false);
          return;
        }

        const code = match[1];
        if (code !== "220" && code !== "250") {
          finish(null);
          return;
        }

        const message = messages.shift();
        if (message) {
          socket.write(`${message}\r\n`);
          return;
        }

        finish(true);
      });

      socket.on("error", () => finish(null));
      responseTimeout = setTimeout(() => finish(null), timeoutMs);
    });
  }
}
