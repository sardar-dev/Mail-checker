"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FAQItem } from "@/types";

const faqItems: FAQItem[] = [
  {
    question: "How does Gmail Checker work?",
    answer:
      "Gmail Checker performs a comprehensive validation process for each email address. It verifies syntax, checks if the domain is Gmail, performs DNS lookups to confirm domain existence, and queries MX records to verify the domain can receive emails. It also detects disposable email providers and role-based accounts, then calculates a deliverability score.",
  },
  {
    question: "Can I check multiple emails at once?",
    answer:
      "Yes! You can paste multiple email addresses into the textarea — one per line. Gmail Checker supports bulk validation of up to 100 email addresses in a single check. Duplicate emails are automatically detected and removed, and empty lines are ignored.",
  },
  {
    question: "What is the maximum limit?",
    answer:
      "You can check up to 100 email addresses per validation run. This limit ensures optimal performance and prevents abuse. If you need to check more addresses, you can run multiple checks sequentially.",
  },
  {
    question: "Does this store my emails?",
    answer:
      "No. Gmail Checker does not store, log, or share any email addresses you enter. All validation is performed in real-time, and no data is persisted to any database. Your privacy is fully protected.",
  },
  {
    question: "How accurate are the results?",
    answer:
      "The results are highly accurate for syntax validation, Gmail detection, DNS resolution, and MX record verification. However, the tool cannot verify if a specific mailbox exists (e.g., whether john@gmail.com is an active account) — that would require sending an actual email. The deliverability score provides a reliable confidence indicator.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-gray-400">
            Everything you need to know about Gmail Checker.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="text-white font-medium pr-4">
                  {item.question}
                </span>
                <motion.svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </motion.svg>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                    role="region"
                  >
                    <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
