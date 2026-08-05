declare module "email-deep-validator" {
  interface EmailValidatorOptions {
    timeout?: number;
    verifyDomain?: boolean;
    verifyMailbox?: boolean;
  }

  interface VerifyResult {
    wellFormed: boolean;
    validDomain: boolean;
    validMailbox: boolean | null;
  }

  export default class EmailValidator {
    constructor(options?: EmailValidatorOptions);
    verify(email: string): Promise<VerifyResult>;
  }
}
