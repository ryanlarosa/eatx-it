import React from "react";
import { Link } from "react-router-dom";

export type DotTone = "emerald" | "amber" | "red" | "blue" | "slate" | "purple";

const DOT_COLOR: Record<DotTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  slate: "bg-slate-400 dark:bg-slate-500",
};

const PILL_TONE: Record<DotTone, string> = {
  emerald:
    "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
  amber:
    "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  red: "text-red-700 bg-red-500/10 border-red-500/20 dark:text-red-400",
  blue: "text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-400",
  purple:
    "text-purple-700 bg-purple-500/10 border-purple-500/20 dark:text-purple-400",
  slate:
    "text-slate-600 bg-slate-500/10 border-slate-500/20 dark:text-slate-300",
};

export const StatusPill: React.FC<{
  label: string;
  tone?: DotTone;
  pulse?: boolean;
}> = ({ label, tone = "slate", pulse = false }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border ${PILL_TONE[tone]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[tone]} ${
        pulse ? "animate-pulse" : ""
      }`}
    />
    {label}
  </span>
);

export const MetricTile: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  tone?: DotTone;
  to?: string;
  alert?: boolean;
}> = ({ label, value, subtext, tone = "slate", to, alert = false }) => {
  const inner = (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        alert
          ? "bg-white dark:bg-[#12151C] border-red-500/50 dark:border-red-500/40"
          : "bg-white dark:bg-[#12151C] border-[#E4E6EB] dark:border-[#222733] hover:border-[#C7CCD6] dark:hover:border-[#343C4F]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5A6270] dark:text-[#8B94A5]">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full ${DOT_COLOR[tone]}`} />
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[#111318] dark:text-[#F1F3F7] tabular-nums mt-2">
        {value}
      </div>
      {subtext && (
        <div
          className={`text-xs mt-1 truncate ${
            alert
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-[#5A6270] dark:text-[#8B94A5]"
          }`}
        >
          {subtext}
        </div>
      )}
    </div>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : inner;
};

export const OpsPanel: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className = "" }) => (
  <section
    className={`bg-white dark:bg-[#12151C] border border-[#E4E6EB] dark:border-[#222733] rounded-lg overflow-hidden ${className}`}
  >
    <div className="px-4 py-3 border-b border-[#E4E6EB] dark:border-[#222733] flex items-center justify-between gap-3 bg-[#F8F9FB] dark:bg-[#151922]">
      <div className="min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#111318] dark:text-[#F1F3F7] truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-[#5A6270] dark:text-[#8B94A5] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="p-4">{children}</div>
  </section>
);
