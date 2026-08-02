import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function estimateTimeRemaining(
  elapsed: number,
  completed: number,
  total: number
): string {
  if (completed === 0) return "Calculating...";
  const avgPerEmail = elapsed / completed;
  const remaining = total - completed;
  const estimatedMs = avgPerEmail * remaining;
  return formatTime(estimatedMs);
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s@.\-+]/g, "")
    .trim();
}

export function parseEmails(input: string): {
  emails: string[];
  duplicatesRemoved: number;
} {
  const lines = input
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicates = 0;

  for (const line of lines) {
    const email = sanitizeInput(line).toLowerCase();
    if (email.length === 0) continue;
    if (seen.has(email)) {
      duplicates++;
      continue;
    }
    seen.add(email);
    unique.push(email);
  }

  return { emails: unique, duplicatesRemoved: duplicates };
}
