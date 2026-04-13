import React from "react";

export function LoadingState() {
  return (
    <div className="p-3 space-y-2" data-testid="loading-state">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton w-5 h-5 rounded-full" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-3 w-12 rounded" />
            <div className="skeleton h-3 w-12 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
