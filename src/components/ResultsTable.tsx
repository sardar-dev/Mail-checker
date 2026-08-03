"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { ValidationResult, EmailStatus } from "@/types";
import {
  resultsToText,
  resultsToCSV,
  resultsToJSON,
  downloadFile,
  copyToClipboard,
  printResults,
} from "@/utils/download";

interface ResultsTableProps {
  results: ValidationResult[];
  onClear: () => void;
}

function StatusBadge({ status }: { status: EmailStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Live
      </span>
    );
  }

  if (status === "not_exist") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/10 border border-amber-400/20 text-amber-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Not Exist
      </span>
    );
  }

  if (status === "unknown") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-400/10 border border-slate-400/20 text-slate-300">
        Unknown
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-400/10 border border-red-400/20 text-red-400">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Invalid
    </span>
  );
}

export default function ResultsTable({ results, onClear }: ResultsTableProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = resultsToText(results);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [results]);

  const handleDownloadTxt = useCallback(() => {
    downloadFile(resultsToText(results), "gmail-check-results.txt", "text/plain");
  }, [results]);

  const handleDownloadCSV = useCallback(() => {
    downloadFile(resultsToCSV(results), "gmail-check-results.csv", "text/csv");
  }, [results]);

  const handleDownloadJSON = useCallback(() => {
    downloadFile(
      resultsToJSON(results),
      "gmail-check-results.json",
      "application/json"
    );
  }, [results]);

  const handlePrint = useCallback(() => {
    printResults();
  }, []);

  const getRowBg = (status: EmailStatus) => {
    if (status === "live") return "hover:bg-emerald-500/[0.03]";
    if (status === "not_exist") return "hover:bg-amber-500/[0.03]";
    if (status === "unknown") return "hover:bg-slate-500/[0.03]";
    return "hover:bg-red-500/[0.03]";
  };

  return (
    <div className="mt-8">
      <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-xl font-bold text-white">
              Results
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({results.length} email{results.length !== 1 ? "s" : ""})
              </span>
            </h3>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                aria-label="Copy results"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                aria-label="Download as TXT"
              >
                TXT
              </button>

              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                aria-label="Download as CSV"
              >
                CSV
              </button>

              <button
                onClick={handleDownloadJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                aria-label="Download as JSON"
              >
                JSON
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                aria-label="Print results"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>

              <button
                onClick={onClear}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                aria-label="Clear results"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Email validation results">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map((result, index) => (
                <motion.tr
                  key={result.email}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`${getRowBg(result.status)} transition-colors`}
                >
                  <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-white font-mono">{result.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge status={result.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{result.reason}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
