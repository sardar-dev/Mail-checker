"use client";

import React from "react";

interface StatCardProps {
  label: string;
  count: number;
  total: number;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  active?: boolean;
  onClick?: () => void;
}

export default function StatCard({
  label,
  count,
  total,
  color,
  bgColor,
  borderColor,
  glowColor,
  active = false,
  onClick,
}: StatCardProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: active ? bgColor : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? borderColor : "rgba(255,255,255,0.07)"}`,
        borderRadius: "12px",
        padding: "16px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        boxShadow: active ? `0 0 20px ${glowColor}` : "none",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (!active && onClick) {
          (e.currentTarget as HTMLDivElement).style.border = `1px solid ${borderColor}`;
          (e.currentTarget as HTMLDivElement).style.background = bgColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!active && onClick) {
          (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
        }
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: active ? color : "#9096b0",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: active ? color : "#5a6078",
            fontWeight: 500,
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          color: active ? color : "#e8eaf6",
          lineHeight: 1,
          marginBottom: "10px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count.toLocaleString()}
      </div>
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "2px",
            boxShadow: `0 0 6px ${color}`,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}
