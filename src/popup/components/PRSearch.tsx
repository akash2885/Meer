import React, { useState, useMemo } from "react";
import type { PullRequest } from "../../lib/types";

interface PRSearchProps {
  pullRequests: PullRequest[];
  onFilter: (filtered: PullRequest[]) => void;
}

export function PRSearch({ pullRequests, onFilter }: PRSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pullRequests;
    return pullRequests.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.repo.toLowerCase().includes(q) ||
        pr.author.login.toLowerCase().includes(q)
    );
  }, [query, pullRequests]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value.trim().toLowerCase();
    setQuery(e.target.value);
    onFilter(
      q
        ? pullRequests.filter(
            (pr) =>
              pr.title.toLowerCase().includes(q) ||
              pr.repo.toLowerCase().includes(q) ||
              pr.author.login.toLowerCase().includes(q)
          )
        : pullRequests
    );
  }

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder="Search PRs by title, repo, or author…"
        className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:border-slate-500 placeholder:text-slate-500"
        aria-label="Search pull requests"
      />
    </div>
  );
}
