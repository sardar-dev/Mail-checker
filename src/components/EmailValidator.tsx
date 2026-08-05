"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";

type Status = "live" | "disabled" | "unregistered" | "unknown" | "verify";

interface EmailResult {
  email: string;
  originalRecord: string;
  status: Status;
  wellFormed: boolean;
  validDomain: boolean | null;
  validMailbox: boolean | null;
}

interface Counts {
  total: number;
  live: number;
  disabled: number;
  unregistered: number;
  unknown: number;
  verify: number;
}

interface ValidationResponse {
  jobId: string;
  counts: Counts;
  results: EmailResult[];
}

type InputTab = "manual" | "file";
type OutputMode = "mail_status" | "account_status";
type FilterStatus = "all" | Status;

const MAX_LINES = 5000;

const statCards = [
  {
    key: "total" as const,
    label: "Processed",
    color: "#4f6ef7",
    bgColor: "rgba(79,110,247,0.12)",
    borderColor: "rgba(79,110,247,0.4)",
    glowColor: "rgba(79,110,247,0.2)",
  },
  {
    key: "live" as const,
    label: "Live",
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.4)",
    glowColor: "rgba(34,197,94,0.2)",
  },
  {
    key: "disabled" as const,
    label: "Disabled",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.4)",
    glowColor: "rgba(239,68,68,0.2)",
  },
  {
    key: "verify" as const,
    label: "Verify",
    color: "#06b6d4",
    bgColor: "rgba(6,182,212,0.12)",
    borderColor: "rgba(6,182,212,0.4)",
    glowColor: "rgba(6,182,212,0.2)",
  },
  {
    key: "unregistered" as const,
    label: "Unregistered",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.4)",
    glowColor: "rgba(245,158,11,0.2)",
  },
  {
    key: "unknown" as const,
    label: "Unknown",
    color: "#9096b0",
    bgColor: "rgba(144,150,176,0.12)",
    borderColor: "rgba(144,150,176,0.4)",
    glowColor: "rgba(144,150,176,0.2)",
  },
];

export default function EmailValidator() {
  const [inputTab, setInputTab] = useState<InputTab>("manual");
  const [emailText, setEmailText] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("mail_status");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoLoad, setAutoLoad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lineCount = emailText
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  const filteredResults = results.filter((r) => {
    if (filterStatus === "all") return true;
    return r.status === filterStatus;
  });

  const getOutputText = useCallback(() => {
    return filteredResults
      .map((r) => {
        const statusLabel = r.status.toUpperCase();
        if (outputMode === "account_status") {
          const account = r.email.split("@")[0];
          return `${account}|${statusLabel}`;
        }
        return `${r.email}|${statusLabel}`;
      })
      .join("\n");
  }, [filteredResults, outputMode]);

  const handleValidate = async () => {
    const lines = emailText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, MAX_LINES);

    if (lines.length === 0) {
      setError("Please enter at least one email address.");
      return;
    }

    setError(null);
    setLoading(true);
    setProgress(0);
    setResults([]);
    setCounts(null);
    setJobId(null);

    abortRef.current = new AbortController();

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 3, 90));
    }, 500);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: lines,
          verifyDomain: true,
          verifyMailbox: true,
          timeout: 8000,
        }),
        signal: abortRef.current.signal,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Validation failed");
      }

      const data: ValidationResponse = await res.json();
      setJobId(data.jobId);
      setCounts(data.counts);
      setResults(data.results);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message || "Validation failed. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
    setProgress(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setEmailText(text);
      setInputTab("manual");
    };
    reader.readAsText(file);
  };

  const handleCopy = async () => {
    const text = getOutputText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "csv" | "txt") => {
    if (!jobId) return;
    const statusParam = filterStatus !== "all" ? `&status=${filterStatus}` : "";
    const url = `/api/export?jobId=${jobId}&format=${format}&outputMode=${outputMode}${statusParam}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${filterStatus}-${format === "csv" ? "data.csv" : "results.txt"}`;
    a.click();
  };

  const handleClearInput = () => {
    setEmailText("");
    setResults([]);
    setCounts(null);
    setJobId(null);
    setError(null);
    setFilterStatus("all");
  };

  // Auto load on results update
  useEffect(() => {
    if (autoLoad && counts && results.length > 0) {
      // Already loaded
    }
  }, [autoLoad, counts, results]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0f1a 0%, #0f1117 50%, #0d1020 100%)",
        padding: "0",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "rgba(26,29,39,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #4f6ef7, #06b6d4)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                boxShadow: "0 0 20px rgba(79,110,247,0.4)",
              }}
            >
              ✉
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#e8eaf6", letterSpacing: "-0.02em" }}>
                GmailChecker.VIP
              </div>
              <div style={{ fontSize: "11px", color: "#5a6078", letterSpacing: "0.05em" }}>
                DEEP EMAIL VALIDATION
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "#9096b0",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "4px 12px",
                borderRadius: "6px",
              }}
            >
              Up to 5,000 emails/batch
            </span>
            <a
              href="https://github.com/sardar-dev/Mail-checker"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12px",
                color: "#9096b0",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                transition: "all 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            right: 0,
            height: "2px",
            background: "rgba(255,255,255,0.05)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #4f6ef7, #06b6d4)",
              transition: "width 0.3s ease",
              boxShadow: "0 0 10px #4f6ef7",
            }}
          />
        </div>
      )}

      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "32px",
        }}
      >
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #e8eaf6 30%, #4f6ef7 70%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
              marginBottom: "12px",
              lineHeight: 1.1,
            }}
          >
            Deep Email Validation
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#9096b0",
              maxWidth: "580px",
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Validate email addresses by checking format, MX records, and SMTP connections.
            Process up to 5,000 emails per batch with real-time status.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {[
              { icon: "🔍", text: "Format Check" },
              { icon: "🌐", text: "MX Records" },
              { icon: "📡", text: "SMTP Verify" },
              { icon: "📦", text: "Bulk Export" },
            ].map((f) => (
              <div
                key={f.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#9096b0",
                  background: "rgba(255,255,255,0.04)",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left Panel - Input */}
          <div
            style={{
              background: "#1a1d27",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: "24px 24px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#e8eaf6",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "rgba(79,110,247,0.15)",
                    border: "1px solid rgba(79,110,247,0.3)",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  📋
                </span>
                Input Emails
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#9096b0",
                  marginBottom: "20px",
                  lineHeight: 1.6,
                }}
              >
                Enter one email per line. Commas are treated as separate fields — the email is
                extracted from each record.
              </p>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "0", marginBottom: "-1px" }}>
                {[
                  { id: "manual" as InputTab, icon: "✏️", label: "Manual Input" },
                  { id: "file" as InputTab, icon: "📁", label: "Upload File" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "file") {
                        fileInputRef.current?.click();
                      } else {
                        setInputTab(tab.id);
                      }
                    }}
                    style={{
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        inputTab === tab.id
                          ? "2px solid #4f6ef7"
                          : "2px solid transparent",
                      color: inputTab === tab.id ? "#4f6ef7" : "#9096b0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                    }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Textarea area */}
            <div style={{ padding: "20px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: lineCount > MAX_LINES * 0.8 ? "#f59e0b" : "#5a6078",
                    fontWeight: 500,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {lineCount.toLocaleString()} / {MAX_LINES.toLocaleString()} lines
                </span>
                {emailText && (
                  <button
                    onClick={handleClearInput}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      transition: "all 0.2s",
                    }}
                    title="Clear input"
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>

              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder={`user@example.com\ntest@domain.org\nfoo@company.io`}
                style={{
                  width: "100%",
                  height: "340px",
                  background: "#252837",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "16px",
                  color: "#e8eaf6",
                  fontSize: "13px",
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: "1.8",
                  resize: "vertical",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(79,110,247,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(79,110,247,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  margin: "0 24px 20px",
                  padding: "12px 16px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "10px",
                  color: "#ef4444",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Action button */}
            <div
              style={{
                padding: "0 24px 24px",
                display: "flex",
                gap: "12px",
              }}
            >
              {loading ? (
                <button
                  onClick={handleStop}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: "12px",
                    color: "#ef4444",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #ef4444",
                      borderRadius: "50%",
                      borderTopColor: "transparent",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Stop ({Math.round(progress)}%)
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </button>
              ) : (
                <button
                  onClick={handleValidate}
                  disabled={!emailText.trim()}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: emailText.trim()
                      ? "linear-gradient(135deg, #4f6ef7, #06b6d4)"
                      : "rgba(255,255,255,0.05)",
                    border: emailText.trim()
                      ? "1px solid rgba(79,110,247,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    color: emailText.trim() ? "#fff" : "#5a6078",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: emailText.trim() ? "pointer" : "not-allowed",
                    boxShadow: emailText.trim()
                      ? "0 4px 20px rgba(79,110,247,0.3)"
                      : "none",
                    transition: "all 0.2s",
                    letterSpacing: "0.02em",
                  }}
                >
                  🚀 Validate Emails
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div
            style={{
              background: "#1a1d27",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: "24px 24px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#e8eaf6",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                    }}
                  >
                    📊
                  </span>
                  Check Results
                </h2>
                {jobId && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#5a6078",
                      fontFamily: "'JetBrains Mono', monospace",
                      background: "rgba(255,255,255,0.04)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    Job: {jobId.slice(0, 8)}…
                  </span>
                )}
              </div>

              {/* Stats grid */}
              {counts ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  {statCards.map((card) => (
                    <StatCard
                      key={card.key}
                      label={card.label}
                      count={counts[card.key]}
                      total={counts.total}
                      color={card.color}
                      bgColor={card.bgColor}
                      borderColor={card.borderColor}
                      glowColor={card.glowColor}
                      active={
                        card.key === "total"
                          ? filterStatus === "all"
                          : filterStatus === card.key
                      }
                      onClick={() => {
                        if (card.key === "total") {
                          setFilterStatus("all");
                        } else {
                          setFilterStatus(
                            filterStatus === card.key ? "all" : card.key
                          );
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  {statCards.map((card) => (
                    <div
                      key={card.key}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "12px",
                        padding: "16px",
                        height: "88px",
                      }}
                    >
                      {loading ? (
                        <div
                          style={{
                            height: "100%",
                            background:
                              "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.5s infinite",
                            borderRadius: "8px",
                          }}
                        />
                      ) : (
                        <>
                          <div style={{ fontSize: "11px", color: "#5a6078", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {card.label}
                          </div>
                          <div style={{ fontSize: "28px", fontWeight: 800, color: "#5a6078" }}>—</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output controls */}
            <div
              style={{
                padding: "16px 24px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {/* Output mode toggle */}
              <div
                style={{
                  display: "flex",
                  background: "#252837",
                  borderRadius: "8px",
                  padding: "3px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {[
                  { id: "mail_status" as OutputMode, label: "email|status" },
                  { id: "account_status" as OutputMode, label: "account|status" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOutputMode(opt.id)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: outputMode === opt.id ? "rgba(79,110,247,0.2)" : "transparent",
                      border: outputMode === opt.id ? "1px solid rgba(79,110,247,0.4)" : "1px solid transparent",
                      borderRadius: "6px",
                      color: outputMode === opt.id ? "#4f6ef7" : "#9096b0",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  disabled={filteredResults.length === 0}
                  title="Copy to clipboard"
                  style={{
                    padding: "8px 14px",
                    background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                    border: copied ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: copied ? "#22c55e" : "#9096b0",
                    cursor: filteredResults.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    fontWeight: 600,
                  }}
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>

                {/* Download CSV */}
                <button
                  onClick={() => handleDownload("csv")}
                  disabled={!jobId || filteredResults.length === 0}
                  title="Download CSV"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#9096b0",
                    cursor: jobId && filteredResults.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    fontWeight: 600,
                  }}
                >
                  ⬇ CSV
                </button>

                {/* Download TXT */}
                <button
                  onClick={() => handleDownload("txt")}
                  disabled={!jobId || filteredResults.length === 0}
                  title="Download TXT"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#9096b0",
                    cursor: jobId && filteredResults.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    fontWeight: 600,
                  }}
                >
                  ⬇ TXT
                </button>
              </div>
            </div>

            {/* Results count */}
            {counts && (
              <div
                style={{
                  padding: "10px 24px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", color: "#5a6078" }}>
                  Showing{" "}
                  <strong style={{ color: "#9096b0" }}>
                    {filteredResults.length.toLocaleString()}
                  </strong>{" "}
                  {filterStatus !== "all" ? (
                    <>
                      <StatusBadge status={filterStatus as Status} size="sm" />
                      {" "}
                    </>
                  ) : (
                    ""
                  )}
                  results
                </span>
                {filterStatus !== "all" && (
                  <button
                    onClick={() => setFilterStatus("all")}
                    style={{
                      fontSize: "11px",
                      color: "#4f6ef7",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Show all
                  </button>
                )}
              </div>
            )}

            {/* Results list */}
            <div style={{ padding: "12px 24px 20px" }}>
              {loading && results.length === 0 ? (
                <div
                  style={{
                    height: "300px",
                    background: "#252837",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "3px solid rgba(79,110,247,0.3)",
                      borderTopColor: "#4f6ef7",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <div style={{ color: "#9096b0", fontSize: "14px" }}>
                    Validating emails...{" "}
                    <span style={{ color: "#4f6ef7", fontWeight: 600 }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              ) : filteredResults.length > 0 ? (
                <div
                  style={{
                    background: "#252837",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    overflow: "hidden",
                  }}
                >
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "12px",
                      padding: "10px 16px",
                      background: "rgba(255,255,255,0.03)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#5a6078",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    <span>Email / Record</span>
                    <span>Status</span>
                  </div>

                  {/* Table Body */}
                  <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                    {filteredResults.map((result, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "12px",
                          padding: "10px 16px",
                          borderBottom:
                            idx < filteredResults.length - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                          alignItems: "center",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "rgba(255,255,255,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#e8eaf6",
                              fontFamily: "'JetBrains Mono', monospace",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {outputMode === "account_status"
                              ? result.email.split("@")[0]
                              : result.email}
                          </div>
                          {result.originalRecord !== result.email && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#5a6078",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {result.originalRecord}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={result.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "300px",
                    background: "#252837",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: "#5a6078",
                  }}
                >
                  <div style={{ fontSize: "40px" }}>📊</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#9096b0" }}>
                    No results yet
                  </div>
                  <div style={{ fontSize: "12px", textAlign: "center", maxWidth: "240px" }}>
                    Enter emails on the left and click{" "}
                    <strong style={{ color: "#4f6ef7" }}>Validate Emails</strong> to get started.
                  </div>
                </div>
              )}
            </div>

            {/* Auto-load toggle */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                onClick={() => setAutoLoad(!autoLoad)}
                style={{
                  width: "44px",
                  height: "24px",
                  background: autoLoad
                    ? "linear-gradient(135deg, #4f6ef7, #06b6d4)"
                    : "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  border: autoLoad ? "1px solid rgba(79,110,247,0.5)" : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: autoLoad ? "0 0 10px rgba(79,110,247,0.3)" : "none",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    background: "#fff",
                    borderRadius: "9px",
                    position: "absolute",
                    top: "2px",
                    left: autoLoad ? "22px" : "2px",
                    transition: "left 0.3s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf6" }}>
                  Auto-load results
                </div>
                <div style={{ fontSize: "11px", color: "#5a6078" }}>
                  Automatically refresh results after each validation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status legend */}
        <div
          style={{
            marginTop: "32px",
            background: "#1a1d27",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#e8eaf6",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🏷️</span> Status Definitions
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "16px",
            }}
          >
            {[
              {
                status: "live" as Status,
                desc: "Email address exists and is actively accepting email.",
              },
              {
                status: "disabled" as Status,
                desc: "Mailbox rejected or email format is invalid.",
              },
              {
                status: "unregistered" as Status,
                desc: "Domain does not exist or has no MX records.",
              },
              {
                status: "verify" as Status,
                desc: "Domain valid but SMTP verification not possible (e.g. Yahoo, Hotmail).",
              },
              {
                status: "unknown" as Status,
                desc: "Could not determine validity — connection timed out or blocked.",
              },
            ].map((s) => (
              <div key={s.status}>
                <StatusBadge status={s.status} size="sm" />
                <p style={{ fontSize: "12px", color: "#9096b0", marginTop: "8px", lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "40px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#5a6078" }}>
            GmailChecker.VIP — Powered by DNS & SMTP deep validation
          </span>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Privacy Policy", "Terms of Use", "API Docs"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontSize: "12px",
                  color: "#5a6078",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#9096b0")}
                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#5a6078")}
              >
                {l}
              </a>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
