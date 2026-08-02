declare module "email-deep-validator" {
  interface VerificationResult {
    wellFormed: boolean;
    validDomain: boolean;
    validMailbox: boolean | null;
  }

  interface EmailValidatorOptions {
    timeout?: number;
    verifyDomain?: boolean;
    verifyMailbox?: boolean;
  }

  class EmailValidator {
    constructor(options?: EmailValidatorOptions);
    verify(email: string): Promise<VerificationResult>;
  }

  export default EmailValidator;
}
