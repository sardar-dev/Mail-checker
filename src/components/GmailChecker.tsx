"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ValidationResult, SummaryData, ProgressData } from "@/types";
import { parseEmails } from "@/utils/helpers";
import ProgressBar from "./ProgressBar";
import ResultsTable from "./ResultsTable";
import SummaryCards from "./SummaryCards";

export default function GmailChecker() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [progress, setProgress] = useState<ProgressData>({
    isChecking: false,
    current: 0,
    total: 0,
    currentEmail: "",
    percentage: 0,
    completed: 0,
    remaining: 0,
    estimatedTime: "",
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse and count emails in real-time
  const parsed = inputText.trim() === "" ? { emails: [], duplicatesRemoved: 0 } : parseEmails(inputText);
  const emailCount = parsed.emails.length;
  const duplicateCount = parsed.duplicatesRemoved;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 320) + "px";
    }
  }, [inputText]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
      setError("");
    } catch {
      setError("Unable to access clipboard. Please paste manually with Ctrl+V.");
    }
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const supportedFile = file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".csv");
    if (!supportedFile) {
      setError("Please upload a TXT or CSV file.");
      return;
    }
    if (file.size > 10 * 1024) {
      setError("File is too large. Please upload a file smaller than 10 KB.");
      return;
    }

    try {
      const text = await file.text();
      setInputText(text);
      setError("");
    } catch {
      setError("Unable to read that file. Please try another TXT or CSV file.");
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    event.target.value = "";
  }, [loadFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }, [loadFile]);

  const handleClear = useCallback(() => {
    setInputText("");
    setResults([]);
    setSummary(null);
    setError("");
    setProgress({
      isChecking: false,
      current: 0,
      total: 0,
      currentEmail: "",
      percentage: 0,
      completed: 0,
      remaining: 0,
      estimatedTime: "",
    });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setProgress((prev) => ({ ...prev, isChecking: false }));
  }, []);

  const handleStart = useCallback(async () => {
    setError("");

    if (inputText.trim() === "") {
      setError("Please enter at least one Gmail address.");
      return;
    }

    const { emails, duplicatesRemoved } = parseEmails(inputText);

    if (emails.length === 0) {
      setError("Please enter at least one valid Gmail address.");
      return;
    }

    if (emails.length > 100) {
      setError("Maximum 100 email addresses allowed.");
      return;
    }

    // Reset state
    setResults([]);
    setSummary(null);
    const checkStartTime = Date.now();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setProgress({
      isChecking: true,
      current: 0,
      total: emails.length,
      currentEmail: "",
      percentage: 0,
      completed: 0,
      remaining: emails.length,
      estimatedTime: "Calculating...",
    });

    const allResults: ValidationResult[] = [];
    const total = emails.length;
    let completed = 0;

    // Send in batches of 5 for better server-side caching
    const batchSize = 5;
    for (let i = 0; i < total; i += batchSize) {
      if (abortController.signal.aborted) break;

      const batch = emails.slice(i, i + batchSize);

      setProgress((prev) => ({
        ...prev,
        currentEmail: batch[0] ?? "",
        remaining: total - completed,
      }));

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails: batch }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            setError("Rate limit exceeded. Please wait a moment and try again.");
            break;
          }
          if (response.status === 503) {
            setError("Server is busy. Please wait a moment and try again.");
            break;
          }
          setError("An error occurred during validation. Please try again.");
          break;
        }

        const data = await response.json();

        if (data.results && Array.isArray(data.results)) {
          // Batch update: add all results from this batch at once
          allResults.push(...data.results);
          completed += data.results.length;

          // Single state update per batch instead of per email
          setResults([...allResults]);

          const elapsed = Date.now() - checkStartTime;
          const avgPerEmail = elapsed / completed;
          const remaining = total - completed;
          const estimatedMs = avgPerEmail * remaining;

          setProgress((prev) => ({
            ...prev,
            current: completed,
            percentage: Math.round((completed / total) * 100),
            completed,
            remaining: total - completed,
            currentEmail: data.results[data.results.length - 1]?.email ?? "",
            estimatedTime:
              completed < 2
                ? "Calculating..."
                : estimatedMs < 1000
                  ? `${Math.round(estimatedMs)}ms`
                  : estimatedMs < 60000
                    ? `${(estimatedMs / 1000).toFixed(1)}s`
                    : `${Math.floor(estimatedMs / 60000)}m ${Math.floor((estimatedMs % 60000) / 1000)}s`,
          }));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          break;
        }
        setError("Network error occurred. Please try again.");
        break;
      }
    }

    // Set final summary
    const processingTime = Date.now() - checkStartTime;
    const liveCount = allResults.filter((r) => r.status === "live").length;
    const notExistCount = allResults.filter((r) => r.status === "not_exist").length;
    const unknownCount = allResults.filter((r) => r.status === "unknown").length;
    const invalidCount = allResults.filter((r) => r.status === "invalid").length;
    const avgScore =
      allResults.length > 0
        ? Math.round(
            allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length
          )
        : 0;

    setSummary({
      total: allResults.length,
      live: liveCount,
      notExist: notExistCount,
      unknown: unknownCount,
      invalid: invalidCount,
      duplicatesRemoved,
      processingTime,
      averageScore: avgScore,
    });

    setProgress((prev) => ({
      ...prev,
      isChecking: false,
      percentage: 100,
      completed: allResults.length,
      remaining: 0,
    }));
  }, [inputText]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputText(value);
      setError("");
    },
    []
  );

  return (
    <section id="checker" className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 light:border-black/10 p-6 sm:p-8 shadow-2xl"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl -z-10" />

          <h2 className="text-2xl font-bold text-white light:text-slate-900 mb-6">
            Check Gmail Addresses
          </h2>

          {/* Textarea / file drop zone */}
          <div
            className={`relative mb-4 rounded-xl transition-colors ${isDraggingFile ? "ring-2 ring-blue-400/70 bg-blue-500/10" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!progress.isChecking) setIsDraggingFile(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDraggingFile(false);
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              className="sr-only"
              onChange={handleFileChange}
              disabled={progress.isChecking}
              aria-label="Upload a TXT or CSV file"
            />
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextChange}
              placeholder={`Paste one Gmail address...\n\nor\n\nPaste multiple Gmail addresses.\n\nExample:\njohn@gmail.com\nalex@gmail.com\nexample@gmail.com`}
              className="w-full min-h-[180px] max-h-[320px] p-4 rounded-xl bg-black/40 light:bg-white border border-white/10 light:border-black/10 text-white light:text-slate-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none font-mono text-sm leading-relaxed transition-all duration-200"
              disabled={progress.isChecking}
              aria-label="Enter Gmail addresses to validate"
              aria-describedby="email-counters"
            />
            {isDraggingFile && !progress.isChecking && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-slate-950/90 text-sm font-medium text-blue-200 pointer-events-none">
                Drop a TXT or CSV file to load addresses
              </div>
            )}

            {/* Counters */}
            <div
              id="email-counters"
              className="flex items-center gap-4 mt-2 text-xs text-gray-500 light:text-slate-500"
            >
              <span>
                {emailCount} email{emailCount !== 1 ? "s" : ""}
              </span>
              {duplicateCount > 0 && (
                <span className="text-amber-400">
                  {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}{" "}
                  removed
                </span>
              )}
              <span className="ml-auto">
                {inputText.length} characters
              </span>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-2">
            <button
              onClick={handlePaste}
              disabled={progress.isChecking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 text-gray-300 light:text-slate-600 hover:bg-white/10 light:bg-black/10 hover:text-white light:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              aria-label="Paste from clipboard"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Paste
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={progress.isChecking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 text-gray-300 light:text-slate-600 hover:bg-white/10 light:bg-black/10 hover:text-white light:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              aria-label="Upload TXT or CSV file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 18a4.6 4.6 0 01.88-9.11A5.5 5.5 0 0118.5 11.5H19a3 3 0 010 6h-2m-5-8v9m0-9l-3 3m3-3l3 3" />
              </svg>
              Upload TXT/CSV
            </button>

            <button
              onClick={handleClear}
              disabled={progress.isChecking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 text-gray-300 light:text-slate-600 hover:bg-white/10 light:bg-black/10 hover:text-white light:text-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              aria-label="Clear all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear
            </button>

            <div className="flex-1" />

            {progress.isChecking ? (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all duration-200 text-sm font-medium"
                aria-label="Stop checking"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={emailCount === 0 && inputText.trim() === ""}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                aria-label="Start checking emails"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start Checking
              </button>
            )}
          </div>
        </motion.div>

        {/* Progress Section */}
        <AnimatePresence>
          {(progress.isChecking || progress.percentage > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProgressBar progress={progress} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ResultsTable results={results} onClear={handleClear} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Section */}
        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SummaryCards summary={summary} results={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
