import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

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
    const result: VerifyResult = { wellFormed: false, validDomain: false, validMailbox: null };
    let local: string;
    let domain: string;

    if (!address.includes("@")) {
      return result;
    }

    [local, domain] = address.split("@");
    if (!local || !domain) {
      return result;
    }

    result.wellFormed = true;

    if (!this.verifyDomainOpt && !this.verifyMailboxOpt) {
      return result;
    }

    let mxRecords: string[] = [];
    try {
      const records = await resolveMx(domain);
      records.sort((a, b) => a.priority - b.priority);
      mxRecords = records.map((record) => record.exchange);
    } catch {
      mxRecords = [];
    }

    if (this.verifyDomainOpt) {
      result.validDomain = mxRecords.length > 0;
    }

    if (this.verifyMailboxOpt) {
      result.validMailbox = await EmailValidator.verifyMailbox(
        local,
        domain,
        mxRecords[0],
        this.timeout
      );
    }

    return result;
  }

  private static isInvalidMailboxError(smtpReply: string): boolean {
    if (
      smtpReply &&
      /^(510|511|513|550|551|553)/.test(smtpReply) &&
      !/(junk|spam|openspf|spoofing|host|rbl.+blocked)/i.test(smtpReply)
    ) {
      return true;
    }
    return false;
  }

  private static verifyMailbox(
    local: string,
    domain: string,
    mxRecord: string | undefined,
    timeoutMs: number
  ): Promise<boolean | null> {
    if (!mxRecord || /yahoo/.test(mxRecord)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const socket = net.connect(25, mxRecord);
      let resTimeout: NodeJS.Timeout;
      let resolved = false;

      const ret = (result: boolean | null) => {
        if (resolved) return;
        resolved = true;

        if (!socket.destroyed) {
          socket.write("QUIT\r\n");
          socket.end();
        }

        clearTimeout(resTimeout);
        resolve(result);
      };

      const messages = [
        `HELO ${domain}`,
        `MAIL FROM: <${local}@${domain}>`,
        `RCPT TO: <${local}@${domain}>`,
      ];

      let buffer = "";

      socket.on("data", (data) => {
        buffer += data.toString();

        if (!buffer.endsWith("\n")) {
          return;
        }

        const lines = buffer
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) return;

        const lastLine = lines[lines.length - 1];

        // Check if the response is multiline and incomplete
        // A complete response's last line starts with a 3-digit code followed by a space.
        // A partial multiline response's line starts with a 3-digit code followed by a dash.
        const match = lastLine.match(/^(\d{3})(.)/);
        if (match && match[2] === "-") {
          return; // Wait for more data
        }

        // We have a complete response block
        const responseBlock = buffer;
        buffer = ""; // Reset buffer for the next exchange

        if (EmailValidator.isInvalidMailboxError(responseBlock)) {
          return ret(false);
        }

        const code = match ? match[1] : null;
        if (code !== "220" && code !== "250") {
          return ret(null); // Unknown or unhandled error
        }

        if (messages.length > 0) {
          const message = messages.shift();
          if (message) {
            socket.write(message + "\r\n");
          }
          return;
        }

        ret(true);
      });

      socket.on("error", () => {
        ret(null);
      });

      resTimeout = setTimeout(() => {
        ret(null);
      }, timeoutMs);
    });
  }
}
