"use client";

import { motion } from "framer-motion";
import type { ProgressData } from "@/types";

interface ProgressBarProps {
  progress: ProgressData;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="mt-8 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 light:border-black/10 p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        {progress.isChecking && (
          <div className="relative">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-white light:text-slate-900">
          {progress.isChecking ? "Checking..." : "Complete"}
        </h3>
        <span className="ml-auto text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {progress.percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 rounded-full bg-white/5 light:bg-black/5 overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 light:border-black/5">
          <p className="text-xs text-gray-500 light:text-slate-500 mb-1">Current</p>
          <p className="text-sm text-white light:text-slate-900 font-medium truncate" title={progress.currentEmail}>
            {progress.currentEmail || "—"}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 light:border-black/5">
          <p className="text-xs text-gray-500 light:text-slate-500 mb-1">Completed</p>
          <p className="text-sm text-white light:text-slate-900 font-medium">
            {progress.completed} / {progress.total}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 light:border-black/5">
          <p className="text-xs text-gray-500 light:text-slate-500 mb-1">Remaining</p>
          <p className="text-sm text-white light:text-slate-900 font-medium">{progress.remaining}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 light:border-black/5">
          <p className="text-xs text-gray-500 light:text-slate-500 mb-1">Est. Time</p>
          <p className="text-sm text-white light:text-slate-900 font-medium">
            {progress.estimatedTime || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
