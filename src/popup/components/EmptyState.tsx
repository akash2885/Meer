import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "✓", title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-center min-h-[140px]">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
