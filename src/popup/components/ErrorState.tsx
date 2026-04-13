import React from "react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">Failed to load PRs</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[260px]">{message}</p>
      </div>
      <button onClick={onRetry} className="btn-primary text-xs">
        Try again
      </button>
    </div>
  );
}
