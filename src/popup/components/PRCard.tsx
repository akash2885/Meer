import React, { useState } from "react";
import type { PullRequest } from "../../lib/types";
import { timeAgo, truncate } from "../../lib/utils";
import { CIStatus } from "./CIStatus";
import { createClient } from "../../lib/github";
import { useStore } from "../hooks/useStore";

interface PRCardProps {
  pr: PullRequest;
  showActionReason?: boolean;
}

function HealthBadge({ status }: { status: PullRequest["healthStatus"] }) {
  if (status === "good") {
    return (
      <span className="badge-green" title="All checks passing">
        ●
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="badge-yellow" title="Checks running or pending review">
        ●
      </span>
    );
  }
  return (
    <span className="badge-red" title="CI failing, changes requested, or merge conflict">
      ●
    </span>
  );
}

function CIIcon({ pr }: { pr: PullRequest }) {
  const runs = pr.checkRuns;
  if (runs.length === 0) return null;
  const failing = runs.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
  const running = runs.some((c) => c.status !== "COMPLETED");
  if (failing)
    return (
      <span className="text-red-400 text-xs" title="CI failing">
        ✗
      </span>
    );
  if (running)
    return (
      <span className="text-amber-400 text-xs animate-spin inline-block" title="CI running">
        ⟳
      </span>
    );
  return (
    <span className="text-emerald-400 text-xs" title="CI passing">
      ✓
    </span>
  );
}

export function PRCard({ pr, showActionReason = false }: PRCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const { settings, fetchPRs } = useStore();

  function openPR(e: React.MouseEvent) {
    e.preventDefault();
    chrome.tabs.create({ url: pr.url });
  }

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Approve "${pr.title}"?`)) return;
    const [owner, repo] = pr.repo.split("/");
    setApproving(true);
    try {
      const client = createClient(settings);
      await client.approvePR(owner, repo, pr.number);
      setApproved(true);
      fetchPRs();
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setApproving(false);
    }
  }

  const isDraft = pr.isDraft;
  const isConflicting = pr.mergeable === "CONFLICTING";

  return (
    <div className="card p-3 hover:brightness-110 transition-all cursor-pointer" onClick={openPR}>
      {/* Top row: repo + health + ci */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-slate-400 truncate flex-1">{pr.repo}</span>
        <CIIcon pr={pr} />
        <HealthBadge status={pr.healthStatus} />
      </div>

      {/* Title */}
      <p className="text-sm text-slate-100 font-medium leading-snug mb-2" title={pr.title}>
        {isDraft && (
          <span className="text-xs text-slate-500 mr-1.5 font-normal border border-slate-600 px-1 py-0.5 rounded">
            Draft
          </span>
        )}
        {truncate(pr.title, 80)}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        {/* Author avatar + name */}
        <span className="flex items-center gap-1">
          <img
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            className="w-4 h-4 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span>{pr.author.login}</span>
        </span>

        <span>{timeAgo(pr.updatedAt)}</span>

        {pr.requestedReviewerCount > 0 && (
          <span title="Approvals">
            {pr.approvalCount}/{pr.requestedReviewerCount} ✓
          </span>
        )}

        {pr.comments.length > 0 && <span title="Comments">💬 {pr.comments.length}</span>}

        {isConflicting && (
          <span className="text-red-400" title="Merge conflict">
            ⚠ Conflict
          </span>
        )}
      </div>

      {/* Action reason */}
      {showActionReason && pr.actionReason && (
        <div className="mt-2 text-xs text-amber-400 font-medium">→ {pr.actionReason}</div>
      )}

      {/* Expanded CI / quick actions */}
      <div className="flex items-center gap-2 mt-2">
        {pr.checkRuns.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? "▲ Hide CI" : "▼ Show CI"}
          </button>
        )}

        {pr.relationship !== "authored" && !approved && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 ml-auto"
          >
            {approving ? "Approving…" : "✓ Approve"}
          </button>
        )}

        {approved && <span className="text-xs text-emerald-400 ml-auto">Approved!</span>}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <CIStatus pr={pr} />
        </div>
      )}
    </div>
  );
}
