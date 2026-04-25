import React, { useState } from "react";
import type { PullRequest, Comment } from "../../lib/types";
import { timeAgo } from "../../lib/utils";
import { createClient } from "../../lib/github";
import { useStore } from "../hooks/useStore";
import { ReplyIcon, CheckIcon } from "./Icons";

interface PRCommentsProps {
  pr: PullRequest;
}

const PRIORITY_DOT: Record<Comment["priorityLevel"], string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-slate-500",
};

function CommentRow({ comment, prNumber, repo }: { comment: Comment; prNumber: number; repo: string }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { settings, fetchPRs } = useStore();

  async function handleSubmitReply(e: React.MouseEvent) {
    e.stopPropagation();
    if (!body.trim()) return;
    const [owner, repoName] = repo.split("/");
    setSubmitting(true);
    try {
      const client = createClient(settings);
      await client.addPRComment(owner, repoName, prNumber, body.trim());
      setSent(true);
      setBody("");
      setReplyOpen(false);
      fetchPRs();
    } catch (err) {
      console.error("Reply failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function openComment(e: React.MouseEvent) {
    e.stopPropagation();
    chrome.tabs.create({ url: comment.url });
  }

  return (
    <div className="py-2 border-b border-slate-700/50 last:border-0" onClick={(e) => e.stopPropagation()}>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[comment.priorityLevel]}`}
          title={`${comment.priorityLevel} priority`}
        />
        <span className="text-xs font-medium text-slate-300">@{comment.author}</span>
        <span className="text-xs text-slate-500 ml-auto shrink-0">{timeAgo(comment.createdAt)}</span>
      </div>

      {/* Body */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-1.5">{comment.body}</p>

      {/* Actions */}
      {sent ? (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckIcon className="w-3 h-3" /> Reply sent
        </span>
      ) : (
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReplyOpen((v) => !v);
                setBody("");
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Reply to comment"
            >
              <ReplyIcon className="w-3 h-3" />
              Reply
            </button>
            <button
              onClick={openComment}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Open comment on GitHub"
            >
              View on GitHub
            </button>
          </div>

          {replyOpen && (
            <div className="mt-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1.5 resize-none focus:outline-none focus:border-slate-500"
                aria-label="Reply body"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleSubmitReply}
                  disabled={submitting || !body.trim()}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40"
                >
                  {submitting ? "Sending…" : "Send reply"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyOpen(false);
                    setBody("");
                  }}
                  className="text-xs px-2 py-1 rounded text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PRComments({ pr }: PRCommentsProps) {
  const comments = pr.comments.filter((c) => !c.isResolved);
  const resolved = pr.comments.filter((c) => c.isResolved);
  const [showResolved, setShowResolved] = useState(false);

  const visible = showResolved ? pr.comments : comments;

  if (pr.comments.length === 0) {
    return <p className="text-xs text-slate-500 py-2 text-center">No comments yet</p>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {visible.map((comment) => (
        <CommentRow key={comment.id} comment={comment} prNumber={pr.number} repo={pr.repo} />
      ))}
      {resolved.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowResolved((v) => !v);
          }}
          className="text-xs text-slate-500 hover:text-slate-300 mt-1 w-full text-center py-1"
        >
          {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
        </button>
      )}
    </div>
  );
}
