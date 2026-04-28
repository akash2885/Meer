import React, { useEffect, useState, useCallback } from "react";
import type { PullRequest } from "../../lib/types";

interface KeyboardNavProps {
  pullRequests: PullRequest[];
  onSelect: (pr: PullRequest) => void;
  onBulkApprove: (prs: PullRequest[]) => void;
}

// Keyboard shortcut map
const SHORTCUTS = {
  next: "j",
  prev: "k",
  open: "Enter",
  approve: "a",
  bulkApprove: "A",
  dismiss: "Escape",
};

export function KeyboardNav({ pullRequests, onSelect, onBulkApprove }: KeyboardNavProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case SHORTCUTS.next:
          setFocusedIndex((i) => Math.min(i + 1, pullRequests.length - 1));
          break;
        case SHORTCUTS.prev:
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case SHORTCUTS.open:
          onSelect(pullRequests[focusedIndex]);
          break;
        case SHORTCUTS.approve:
          setBulkSelected((s) => new Set([...s, pullRequests[focusedIndex].id]));
          break;
        case SHORTCUTS.bulkApprove:
          onBulkApprove(pullRequests.filter((pr) => bulkSelected.has(pr.id)));
          setBulkSelected(new Set());
          break;
        case SHORTCUTS.dismiss:
          setBulkSelected(new Set());
          break;
      }
    },
    [pullRequests, focusedIndex, bulkSelected, onSelect, onBulkApprove]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function bulkAppove(prs: PullRequest[]) {
    const results = prs.map((pr) => onBulkApprove([pr]));
    return results;
  }

  return (
    <div className="keyboard-nav">
      {bulkSelected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-400">
          <span>{bulkSelected.size} selected</span>
          <button
            className="text-emerald-400 hover:text-emerald-300"
            onClick={() => onBulkApprove(pullRequests.filter((pr) => bulkSelected.has(pr.id)))}
          >
            Approve all
          </button>
          <button className="text-slate-500 hover:text-slate-300" onClick={() => setBulkSelected(new Set())}>
            Clear
          </button>
        </div>
      )}
      {pullRequests.map((pr, i) => (
        <div
          key={pr.id}
          className={`border-l-2 transition-colors ${
            i === focusedIndex ? "border-blue-500 bg-slate-800/50" : "border-transparent"
          }`}
        >
          <input
            type="checkbox"
            checked={bulkSelected.has(pr.id)}
            onChange={(e) => {
              const next = new Set(bulkSelected);
              e.target.checked ? next.add(pr.id) : next.delete(pr.id);
              setBulkSelected(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}
