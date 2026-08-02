import type { ValidationResult } from "@/types";

export function resultsToText(results: ValidationResult[]): string {
  const lines = [
    "Gmail Checker Results",
    "=====================",
    "",
    ...results.map(
      (r, i) =>
        `${i + 1}. ${r.email} | ${r.status.toUpperCase()} | ${r.reason}`
    ),
  ];
  return lines.join("\n");
}

export function resultsToCSV(results: ValidationResult[]): string {
  const header = "#,Email,Status,Reason";
  const rows = results.map(
    (r, i) =>
      `${i + 1},"${r.email}",${r.status.toUpperCase()},"${r.reason}"`
  );
  return [header, ...rows].join("\n");
}

export function resultsToJSON(results: ValidationResult[]): string {
  return JSON.stringify(results, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  );
}

export function printResults(): void {
  window.print();
}
