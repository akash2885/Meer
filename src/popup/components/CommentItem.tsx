import React from "react";
import type { Comment } from "../../lib/types";
import { timeAgo, truncate } from "../../lib/utils";

interface CommentItemProps {
  comment: Comment;
}

const PRIORITY_STYLES: Record<Comment["priorityLevel"], { badge: string; dot: string }> = {
  high: { badge: "badge-red", dot: "bg-red-400" },
  medium: { badge: "badge-yellow", dot: "bg-amber-400" },
  low: { badge: "badge-gray", dot: "bg-slate-500" },
};

export function CommentItem({ comment }: CommentItemProps) {
  const styles = PRIORITY_STYLES[comment.priorityLevel];

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    chrome.tabs.create({ url: comment.url });
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left card p-3 hover:brightness-110 transition-all block"
      aria-label={`Comment by ${comment.author} on ${comment.prTitle}`}
    >
      {/* Top row: priority + author + time */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`${styles.badge} capitalize`} data-testid="priority-badge">
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          {comment.priorityLevel}
        </span>
        <span className="text-xs text-slate-400 flex-1 truncate">
          <span className="font-medium text-slate-300">@{comment.author}</span>
          {" on "}
          <span className="truncate">{truncate(comment.prTitle, 40)}</span>
        </span>
        <span className="text-xs text-slate-500 shrink-0">{timeAgo(comment.createdAt)}</span>
      </div>

      {/* Comment body snippet */}
      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
        {truncate(comment.body, 120)}
      </p>

      {/* Repo */}
      <p className="text-xs text-slate-500 mt-1">{comment.repo}</p>
    </button>
  );
}
