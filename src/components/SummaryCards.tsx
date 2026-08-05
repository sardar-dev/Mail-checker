"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { SummaryData, ValidationResult, EmailStatus } from "@/types";
import { formatTime } from "@/utils/helpers";

interface SummaryCardsProps {
  summary: SummaryData;
  results: ValidationResult[];
}

function CopyButton({ emails, label }: { emails: string[]; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }, [emails]);

  if (emails.length === 0) return null;

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 hover:bg-white/10 light:bg-black/10 hover:border-white/20 light:border-black/20 transition-all duration-200 group"
      aria-label={`Copy ${label} emails`}
      title={`Copy ${label} emails`}
    >
      {copied ? (
        <svg
          className="w-3.5 h-3.5 text-emerald-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5 text-gray-400 light:text-slate-500 group-hover:text-white light:text-slate-900 transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* 3D copy icon - two layered documents */}
          <rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" opacity="0.15" />
          <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 16V4a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 16V6a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      )}
    </button>
  );
}

export default function SummaryCards({ summary, results }: SummaryCardsProps) {
  const allEmails = results.map((r) => r.email);
  const liveEmails = results.filter((r) => r.status === "live").map((r) => r.email);
  const notExistEmails = results.filter((r) => r.status === "not_exist").map((r) => r.email);
  const unknownEmails = results.filter((r) => r.status === "unknown").map((r) => r.email);
  const invalidEmails = results.filter((r) => r.status === "invalid").map((r) => r.email);

  const cards = [
    {
      label: "Total Emails",
      value: summary.total,
      copyEmails: allEmails,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Live",
      value: summary.live,
      copyEmails: liveEmails,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Not Exist",
      value: summary.notExist,
      copyEmails: notExistEmails,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Unknown",
      value: summary.unknown,
      copyEmails: unknownEmails,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M12 14a4 4 0 10-4-4" />
        </svg>
      ),
      color: "text-slate-300",
      bg: "bg-slate-400/10",
    },
    {
      label: "Invalid",
      value: summary.invalid,
      copyEmails: invalidEmails,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      label: "Duplicates Removed",
      value: summary.duplicatesRemoved,
      copyEmails: null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Processing Time",
      value: formatTime(summary.processingTime),
      copyEmails: null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-pink-400",
      bg: "bg-pink-400/10",
    },
  ];

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white light:text-slate-900 mb-6">Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="relative rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 light:border-black/10 p-4 text-center"
          >
            {card.copyEmails !== null && (
              <CopyButton emails={card.copyEmails} label={card.label} />
            )}
            <div
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} ${card.color} mb-3`}
            >
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-white light:text-slate-900 mb-1">{card.value}</p>
            <p className="text-xs text-gray-500 light:text-slate-500">{card.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
