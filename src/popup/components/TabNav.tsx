import React from "react";
import type { Tab } from "../App";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  actionCount: number;
  allCount: number;
  commentCount: number;
}

export function TabNav({ activeTab, onTabChange, actionCount, allCount, commentCount }: TabNavProps) {
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "actions", label: "Action Items", count: actionCount },
    { id: "all", label: "All PRs", count: allCount },
    { id: "comments", label: "Comments", count: commentCount > 0 ? commentCount : undefined },
  ];

  return (
    <nav className="flex border-b border-slate-700 bg-slate-900 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                tab.id === "actions" && tab.count > 0 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
