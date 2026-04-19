import React, { useState } from "react";
import type { PullRequest } from "../../lib/types";
import { createClient } from "../../lib/github";
import { useStore } from "../hooks/useStore";
import { DoneAllIcon, ChatIcon, CancelIcon, CheckCircleFilledIcon } from "./Icons";

type ReviewMode = "comment" | "request_changes" | null;

interface ReviewActionsProps {
  pr: PullRequest;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function ReviewActions({ pr, isOpen, onOpen, onClose }: ReviewActionsProps) {
  const [mode, setMode] = useState<ReviewMode>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"approved" | "commented" | "changes_requested" | null>(null);
  const { settings, fetchPRs } = useStore();

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Approve "${pr.title}"?`)) return;
    const [owner, repo] = pr.repo.split("/");
    setSubmitting(true);
    try {
      const client = createClient(settings);
      await client.submitReview(owner, repo, pr.number, "APPROVE");
      setSubmitted("approved");
      onClose();
      fetchPRs();
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode(next: Exclude<ReviewMode, null>, e: React.MouseEvent) {
    e.stopPropagation();
    if (isOpen && mode === next) {
      onClose();
      setMode(null);
    } else {
      setMode(next);
      setBody("");
      onOpen();
    }
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.stopPropagation();
    if (!body.trim()) return;
    const [owner, repo] = pr.repo.split("/");
    const event = mode === "comment" ? "COMMENT" : "REQUEST_CHANGES";
    setSubmitting(true);
    try {
      const client = createClient(settings);
      await client.submitReview(owner, repo, pr.number, event, body.trim());
      setSubmitted(mode === "comment" ? "commented" : "changes_requested");
      onClose();
      setMode(null);
      setBody("");
      fetchPRs();
    } catch (err) {
      console.error("Review submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    onClose();
    setMode(null);
    setBody("");
  }

  if (submitted === "approved") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircleFilledIcon className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }

  if (submitted === "commented") {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <ChatIcon className="w-3.5 h-3.5" /> Commented
      </span>
    );
  }

  if (submitted === "changes_requested") {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <CancelIcon className="w-3.5 h-3.5" /> Changes requested
      </span>
    );
  }

  return (
    <div className="contents" onClick={(e) => e.stopPropagation()}>
      {/* Three action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={submitting}
          title="Approve"
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          aria-label="Approve PR"
        >
          <DoneAllIcon className="w-3.5 h-3.5" />
          Approve
        </button>

        <button
          onClick={(e) => toggleMode("comment", e)}
          title="Leave a comment"
          className={`flex items-center gap-1 text-xs transition-colors ${
            isOpen && mode === "comment"
              ? "text-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
          aria-label="Leave a comment"
        >
          <ChatIcon className="w-3.5 h-3.5" />
          Comment
        </button>

        <button
          onClick={(e) => toggleMode("request_changes", e)}
          title="Request changes"
          className={`flex items-center gap-1 text-xs transition-colors ${
            isOpen && mode === "request_changes"
              ? "text-amber-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
          aria-label="Request changes"
        >
          <CancelIcon className="w-3.5 h-3.5" />
          Request changes
        </button>
      </div>

      {/* Inline textarea when comment or request-changes mode is active */}
      {isOpen && mode !== null && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={mode === "comment" ? "Leave a comment…" : "Describe the changes needed…"}
            rows={3}
            className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1.5 resize-none focus:outline-none focus:border-slate-500"
            aria-label={mode === "comment" ? "Comment body" : "Request changes body"}
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40"
            >
              {submitting ? "Submitting…" : mode === "comment" ? "Submit comment" : "Request changes"}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 rounded text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
