import React, { useState } from "react";
import type { PullRequest } from "../../lib/types";
import { timeAgo, truncate } from "../../lib/utils";
import { CIStatus } from "./CIStatus";
import { ReviewActions } from "./ReviewActions";
import { PRComments } from "./PRComments";
import {
  CircleIcon,
  CancelIcon,
  SyncIcon,
  CheckCircleFilledIcon,
  ChatIcon,
  WarningIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  ArrowForwardIcon,
  ContentCopyIcon,
  CheckIcon,
} from "./Icons";

interface PRCardProps {
  pr: PullRequest;
  showActionReason?: boolean;
  expandedReviewCardId?: string | null;
  setExpandedReviewCardId?: (id: string | null) => void;
}

function HealthBadge({ status }: { status: PullRequest["healthStatus"] }) {
  if (status === "good") {
    return (
      <span className="badge-green" title="All checks passing">
        <CircleIcon className="w-2 h-2" />
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="badge-yellow" title="Checks running or pending review">
        <CircleIcon className="w-2 h-2" />
      </span>
    );
  }
  return (
    <span className="badge-red" title="CI failing, changes requested, or merge conflict">
      <CircleIcon className="w-2 h-2" />
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
      <span className="text-red-400" title="CI failing">
        <CancelIcon className="w-3.5 h-3.5" />
      </span>
    );
  if (running)
    return (
      <span className="text-amber-400 animate-spin inline-flex" title="CI running">
        <SyncIcon className="w-3.5 h-3.5" />
      </span>
    );
  return (
    <span className="text-emerald-400" title="CI passing">
      <CheckCircleFilledIcon className="w-3.5 h-3.5" />
    </span>
  );
}

export function PRCard({ pr, showActionReason = false, expandedReviewCardId, setExpandedReviewCardId }: PRCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const reviewIsOpen = expandedReviewCardId === pr.id;

  function openPR(e: React.MouseEvent) {
    e.preventDefault();
    chrome.tabs.create({ url: pr.url });
  }

  function handleCopyUrl(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(pr.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
          <span className="flex items-center gap-0.5" title="Approvals">
            {pr.approvalCount}/{pr.requestedReviewerCount}
            <CheckCircleFilledIcon className="w-3 h-3 text-emerald-500" />
          </span>
        )}

        {pr.comments.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCommentsExpanded((v) => !v);
            }}
            className={`flex items-center gap-0.5 transition-colors ${commentsExpanded ? "text-blue-400" : "hover:text-slate-200"}`}
            title={commentsExpanded ? "Hide comments" : "Show comments"}
            aria-label={commentsExpanded ? "Hide comments" : "Show comments"}
          >
            <ChatIcon className="w-3 h-3" />
            {pr.comments.length}
          </button>
        )}

        {isConflicting && (
          <span className="flex items-center gap-0.5 text-red-400" title="Merge conflict">
            <WarningIcon className="w-3 h-3" />
            Conflict
          </span>
        )}
      </div>

      {/* Action reason */}
      {showActionReason && pr.actionReason && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-400 font-medium">
          <ArrowForwardIcon className="w-3 h-3 shrink-0" />
          {pr.actionReason}
        </div>
      )}

      {/* Expanded CI / quick actions */}
      <div className="flex items-center gap-2 mt-2">
        {pr.checkRuns.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? (
              <>
                <ExpandLessIcon className="w-3.5 h-3.5" /> Hide CI
              </>
            ) : (
              <>
                <ExpandMoreIcon className="w-3.5 h-3.5" /> Show CI
              </>
            )}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCopyUrl}
            title="Copy PR URL"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <ContentCopyIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {pr.relationship !== "authored" && setExpandedReviewCardId && (
        <div className="mt-2">
          <ReviewActions
            pr={pr}
            isOpen={reviewIsOpen}
            onOpen={() => setExpandedReviewCardId(pr.id)}
            onClose={() => setExpandedReviewCardId(null)}
          />
        </div>
      )}

      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <CIStatus pr={pr} />
        </div>
      )}

      {commentsExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <PRComments pr={pr} />
        </div>
      )}
    </div>
  );
}
