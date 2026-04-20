import React from "react";
import { timeAgo } from "../../lib/utils";

interface HeaderProps {
  lastFetched: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Header({ lastFetched, isLoading, onRefresh }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-100 text-sm tracking-wide">Meer</span>
        {lastFetched && <span className="text-slate-500 text-xs">Updated {timeAgo(lastFetched)}</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh"
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          aria-label="Refresh pull requests"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Open settings"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
