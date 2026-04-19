import React, { useMemo } from "react";
import type { PullRequest } from "../../lib/types";

interface RepoFilterProps {
  pullRequests: PullRequest[];
  selectedRepo: string | null;
  onSelect: (repo: string | null) => void;
}

export function RepoFilter({ pullRequests, selectedRepo, onSelect }: RepoFilterProps) {
  const repos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pr of pullRequests) {
      counts.set(pr.repo, (counts.get(pr.repo) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pullRequests]);

  if (repos.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-slate-700/60">
      <select
        value={selectedRepo ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1.5 focus:outline-none focus:border-slate-500 cursor-pointer"
        aria-label="Filter by repository"
      >
        <option value="">All repositories ({pullRequests.length})</option>
        {repos.map(([repo, count]) => (
          <option key={repo} value={repo}>
            {repo} ({count})
          </option>
        ))}
      </select>
    </div>
  );
}
