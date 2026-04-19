import React, { useState } from "react";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useStore } from "./hooks/useStore";
import { Header } from "./components/Header";
import { StatsSummary } from "./components/StatsSummary";
import { TabNav } from "./components/TabNav";
import { ActionItems } from "./components/ActionItems";
import { PRList } from "./components/PRList";
import { CommentFeed } from "./components/CommentFeed";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { KeyIcon } from "./components/Icons";

export type Tab = "actions" | "all" | "comments";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-sm text-red-400">
          <p className="font-medium">Something went wrong</p>
          <p className="text-slate-500 text-xs mt-1">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  useChromeStorage();
  const [activeTab, setActiveTab] = useState<Tab>("actions");
  const { pullRequests, isLoading, error, lastFetched, fetchPRs, settings } = useStore();

  // If no token is configured, prompt user to open settings
  if (!settings.token) {
    return (
      <div className="w-[400px] bg-slate-900 flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
          <KeyIcon className="w-6 h-6 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-slate-100 font-medium">Welcome to PRDash</p>
          <p className="text-slate-400 text-sm mt-1">Add your GitHub token to get started</p>
        </div>
        <button onClick={() => chrome.runtime.openOptionsPage()} className="btn-primary">
          Open Settings
        </button>
      </div>
    );
  }

  const actionCount = pullRequests.filter((p) => p.myActionRequired).length;
  const commentCount = pullRequests.reduce((sum, p) => sum + p.comments.length, 0);

  return (
    <ErrorBoundary>
      <div className="w-[400px] max-h-[550px] bg-slate-900 flex flex-col overflow-hidden">
        <Header lastFetched={lastFetched} isLoading={isLoading} onRefresh={fetchPRs} />
        <StatsSummary pullRequests={pullRequests} />
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actionCount={actionCount}
          allCount={pullRequests.length}
          commentCount={commentCount}
        />
        <div className="flex-1 overflow-y-auto min-h-0">
          {error && !isLoading ? (
            <ErrorState message={error} onRetry={fetchPRs} />
          ) : isLoading && pullRequests.length === 0 ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === "actions" && <ActionItems pullRequests={pullRequests} />}
              {activeTab === "all" && <PRList pullRequests={pullRequests} />}
              {activeTab === "comments" && <CommentFeed pullRequests={pullRequests} />}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
