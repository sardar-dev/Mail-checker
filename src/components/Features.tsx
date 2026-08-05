"use client";

import { motion } from "framer-motion";
import type { FeatureItem } from "@/types";

const features: FeatureItem[] = [
  {
    icon: "✓",
    title: "Gmail Detection",
    description: "Automatically identify Gmail and Googlemail addresses with precision.",
  },
  {
    icon: "✓",
    title: "Email Syntax Validation",
    description: "RFC-compliant syntax checking to ensure proper email formatting.",
  },
  {
    icon: "✓",
    title: "MX Record Check",
    description: "Verify mail exchange records to confirm the domain can receive emails.",
  },
  {
    icon: "✓",
    title: "DNS Lookup",
    description: "Real-time DNS resolution to validate domain existence and configuration.",
  },
  {
    icon: "✓",
    title: "Duplicate Removal",
    description: "Automatically detect and remove duplicate email addresses from your list.",
  },
  {
    icon: "✓",
    title: "Bulk Checking",
    description: "Validate up to 100 email addresses simultaneously in a single check.",
  },
  {
    icon: "✓",
    title: "Instant Results",
    description: "Get real-time validation results as each email is processed.",
  },
  {
    icon: "✓",
    title: "Deliverability Score",
    description: "Comprehensive scoring system to assess email deliverability potential.",
  },
  {
    icon: "✓",
    title: "Responsive Design",
    description: "Fully responsive interface that works on desktop, tablet, and mobile.",
  },
  {
    icon: "✓",
    title: "Fast Processing",
    description: "Optimized batch processing for quick and efficient email validation.",
  },
];

export default function Features() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Powerful{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to validate Gmail addresses with confidence and precision.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-emerald-400 font-bold mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
