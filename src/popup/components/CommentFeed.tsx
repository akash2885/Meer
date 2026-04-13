import React, { useState } from "react";
import type { PullRequest, Comment } from "../../lib/types";
import { CommentItem } from "./CommentItem";
import { EmptyState } from "./EmptyState";

interface CommentFeedProps {
  pullRequests: PullRequest[];
}

export function CommentFeed({ pullRequests }: CommentFeedProps) {
  const [showResolved, setShowResolved] = useState(false);

  // Gather all comments across all PRs
  const allComments: Comment[] = [];
  for (const pr of pullRequests) {
    allComments.push(...pr.comments);
  }

  // Filter out resolved if requested, deduplicate by id
  const seen = new Set<string>();
  const filtered = allComments
    .filter((c) => {
      if (!showResolved && c.isResolved) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

  // Already sorted by priority score from the store
  filtered.sort((a, b) => b.priorityScore - a.priorityScore);

  if (filtered.length === 0) {
    return (
      <>
        {allComments.length > 0 && !showResolved ? (
          <div className="p-3 space-y-2">
            <EmptyState
              icon="✓"
              title="All comments resolved"
              subtitle="Toggle below to show resolved threads"
            />
            <div className="flex justify-center">
              <button
                onClick={() => setShowResolved(true)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Show resolved
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="💬"
            title="No comments yet"
            subtitle="Comments across your PRs will appear here"
          />
        )}
      </>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{filtered.length} comment{filtered.length !== 1 ? "s" : ""}, sorted by priority</p>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>
      {filtered.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
