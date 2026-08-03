export type EmailStatus = "live" | "not_exist" | "unknown" | "invalid";

export interface ValidationResult {
  email: string;
  status: EmailStatus;
  valid: boolean;
  gmail: boolean;
  mx: boolean;
  syntax: boolean;
  domain: boolean;
  mailbox: boolean | null;
  provider: string;
  disposable: boolean;
  roleAccount: boolean;
  score: number;
  confidence: number;
  reason: string;
}

export interface SummaryData {
  total: number;
  live: number;
  notExist: number;
  unknown: number;
  invalid: number;
  duplicatesRemoved: number;
  processingTime: number;
  averageScore: number;
}

export interface ProgressData {
  isChecking: boolean;
  current: number;
  total: number;
  currentEmail: string;
  percentage: number;
  completed: number;
  remaining: number;
  estimatedTime: string;
}

export interface ValidateRequest {
  email: string;
}

export interface ValidateResponse {
  result: ValidationResult;
}

export interface BatchValidateRequest {
  emails: string[];
}

export interface BatchValidateResponse {
  results: ValidationResult[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}
