import React, { useState } from "react";
import type { CheckRun, PullRequest } from "../../lib/types";
import { timeAgo } from "../../lib/utils";
import { createClient } from "../../lib/github";
import { useStore } from "../hooks/useStore";
import { CheckCircleFilledIcon, CancelIcon, SyncIcon, RemoveIcon, BlockIcon, ReplayIcon } from "./Icons";

interface CIStatusProps {
  pr: PullRequest;
}

export function CIStatus({ pr }: CIStatusProps) {
  const { checkRuns } = pr;
  const { settings } = useStore();
  const [rerunning, setRerunning] = useState<string | null>(null);

  if (checkRuns.length === 0) {
    return <p className="text-xs text-slate-500 italic">No CI checks found</p>;
  }

  const passing = checkRuns.filter(
    (c) =>
      c.status === "COMPLETED" &&
      (c.conclusion === "SUCCESS" || c.conclusion === "NEUTRAL" || c.conclusion === "SKIPPED")
  ).length;
  const failing = checkRuns.filter((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE").length;
  const running = checkRuns.filter((c) => c.status !== "COMPLETED").length;

  async function handleRerun(checkRun: CheckRun) {
    const [owner, repo] = pr.repo.split("/");
    setRerunning(checkRun.checkSuiteId);
    try {
      const client = createClient(settings);
      await client.rerequestCheckSuite(owner, repo, checkRun.checkSuiteDatabaseId);
    } catch (err) {
      console.error("Failed to re-run check suite:", err);
    } finally {
      setRerunning(null);
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400">
        {failing > 0
          ? `${failing} of ${checkRuns.length} check${checkRuns.length !== 1 ? "s" : ""} failing`
          : running > 0
            ? `${running} check${running !== 1 ? "s" : ""} running…`
            : `All ${passing} check${passing !== 1 ? "s" : ""} passing`}
      </p>
      <div className="space-y-1 max-h-[160px] overflow-y-auto">
        {checkRuns.map((run) => (
          <CheckRunItem
            key={run.checkSuiteId + run.name}
            run={run}
            onRerun={() => handleRerun(run)}
            isRerunning={rerunning === run.checkSuiteId}
          />
        ))}
      </div>
    </div>
  );
}

interface CheckRunItemProps {
  run: CheckRun;
  onRerun: () => void;
  isRerunning: boolean;
}

export function CheckRunItem({ run, onRerun, isRerunning }: CheckRunItemProps) {
  const icon = getCheckIcon(run);
  const isFailed = run.status === "COMPLETED" && run.conclusion === "FAILURE";

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {run.detailsUrl ? (
          <a
            href={run.detailsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              chrome.tabs.create({ url: run.detailsUrl });
            }}
            className="text-xs text-slate-300 hover:text-blue-400 hover:underline truncate block"
          >
            {run.name}
          </a>
        ) : (
          <span className="text-xs text-slate-300 truncate block">{run.name}</span>
        )}
        {run.completedAt && <span className="text-xs text-slate-500">{timeAgo(run.completedAt)}</span>}
      </div>
      {isFailed && (
        <button
          onClick={onRerun}
          disabled={isRerunning}
          title="Re-run this check"
          className="shrink-0 text-amber-400 hover:text-amber-300 disabled:opacity-50"
        >
          {isRerunning ? <SyncIcon className="w-3.5 h-3.5 animate-spin" /> : <ReplayIcon className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function getCheckIcon(run: CheckRun): React.ReactNode {
  if (run.status !== "COMPLETED") return <SyncIcon className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
  switch (run.conclusion) {
    case "SUCCESS":
      return <CheckCircleFilledIcon className="w-3.5 h-3.5 text-emerald-400" />;
    case "FAILURE":
      return <CancelIcon className="w-3.5 h-3.5 text-red-400" />;
    case "NEUTRAL":
    case "SKIPPED":
      return <RemoveIcon className="w-3.5 h-3.5 text-slate-400" />;
    case "CANCELLED":
    case "TIMED_OUT":
      return <BlockIcon className="w-3.5 h-3.5 text-slate-500" />;
    default:
      return <RemoveIcon className="w-3.5 h-3.5 text-slate-400" />;
  }
}
