"use client";

import React from "react";

type Status = "live" | "disabled" | "unregistered" | "unknown" | "verify";

interface StatusBadgeProps {
  status: Status;
  count?: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  Status,
  { label: string; bg: string; text: string; border: string; glow: string; dot: string }
> = {
  live: {
    label: "Live",
    bg: "rgba(34,197,94,0.12)",
    text: "#22c55e",
    border: "rgba(34,197,94,0.35)",
    glow: "rgba(34,197,94,0.2)",
    dot: "#22c55e",
  },
  disabled: {
    label: "Disabled",
    bg: "rgba(239,68,68,0.12)",
    text: "#ef4444",
    border: "rgba(239,68,68,0.35)",
    glow: "rgba(239,68,68,0.2)",
    dot: "#ef4444",
  },
  unregistered: {
    label: "Unregistered",
    bg: "rgba(245,158,11,0.12)",
    text: "#f59e0b",
    border: "rgba(245,158,11,0.35)",
    glow: "rgba(245,158,11,0.2)",
    dot: "#f59e0b",
  },
  unknown: {
    label: "Unknown",
    bg: "rgba(144,150,176,0.12)",
    text: "#9096b0",
    border: "rgba(144,150,176,0.35)",
    glow: "rgba(144,150,176,0.2)",
    dot: "#9096b0",
  },
  verify: {
    label: "Verify",
    bg: "rgba(6,182,212,0.12)",
    text: "#06b6d4",
    border: "rgba(6,182,212,0.35)",
    glow: "rgba(6,182,212,0.2)",
    dot: "#06b6d4",
  },
};

export default function StatusBadge({ status, count, showCount = false, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const padding = size === "sm" ? "4px 10px" : size === "lg" ? "8px 18px" : "6px 14px";
  const fontSize = size === "sm" ? "11px" : size === "lg" ? "14px" : "12px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: "6px",
        boxShadow: `0 0 10px ${config.glow}`,
      }}
    >
      <span
        style={{
          width: size === "sm" ? "5px" : "6px",
          height: size === "sm" ? "5px" : "6px",
          borderRadius: "50%",
          background: config.dot,
          boxShadow: `0 0 6px ${config.dot}`,
          flexShrink: 0,
        }}
      />
      {config.label}
      {showCount && count !== undefined && (
        <span
          style={{
            background: "rgba(0,0,0,0.25)",
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "11px",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
