import React, { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, POLLING_INTERVAL_OPTIONS } from "../lib/constants";
import { createClient } from "../lib/github";
import { maskToken } from "../lib/utils";
import { STORAGE_KEYS } from "../lib/constants";
import type { Settings, NotificationPreferences, PriorityKeywords } from "../lib/types";

async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.settings, (result) => {
      resolve(result[STORAGE_KEYS.settings] ?? DEFAULT_SETTINGS);
    });
  });
}

async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings }, resolve);
  });
}

export function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedUser, setValidatedUser] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [keywordInput, setKeywordInput] = useState<{ tier: keyof PriorityKeywords; value: string }>({
    tier: "high",
    value: "",
  });

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      // Token is set but not shown — show placeholder
      if (s.token) setTokenInput(maskToken(s.token));
    });
  }, []);

  async function handleValidateToken() {
    const token =
      tokenInput.startsWith("ghp_") || tokenInput.startsWith("github_pat_") || tokenInput.startsWith("ghs_")
        ? tokenInput
        : settings.token; // user might not have re-typed, use existing

    if (!token) {
      setTokenError("Please enter a GitHub token.");
      return;
    }

    setValidating(true);
    setTokenError(null);
    setValidatedUser(null);

    try {
      const client = createClient({ ...settings, token });
      const login = await client.getCurrentUser();
      setValidatedUser(login);
      setSettings((s) => ({ ...s, token }));
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Token validation failed.");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    await saveSettings(settings);
    // Notify the service worker that settings changed
    chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED" }).catch(() => {
      /* SW may be inactive */
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!confirm("Reset all settings to defaults? This will clear your token.")) return;
    setSettings(DEFAULT_SETTINGS);
    setTokenInput("");
    setValidatedUser(null);
    setTokenError(null);
  }

  function updateNotification(key: keyof NotificationPreferences, value: boolean) {
    setSettings((s) => ({
      ...s,
      notifications: { ...s.notifications, [key]: value },
    }));
  }

  function addKeyword(tier: keyof PriorityKeywords, word: string) {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    setSettings((s) => ({
      ...s,
      priorityKeywords: {
        ...s.priorityKeywords,
        [tier]: [...new Set([...s.priorityKeywords[tier], trimmed])],
      },
    }));
  }

  function removeKeyword(tier: keyof PriorityKeywords, word: string) {
    setSettings((s) => ({
      ...s,
      priorityKeywords: {
        ...s.priorityKeywords,
        [tier]: s.priorityKeywords[tier].filter((k) => k !== word),
      },
    }));
  }

  const tierColors: Record<keyof PriorityKeywords, string> = {
    high: "text-red-400",
    medium: "text-amber-400",
    low: "text-slate-400",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Meer Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your GitHub PR dashboard</p>
        </div>

        {/* Token Section */}
        <section className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold">GitHub Authentication</h2>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Personal Access Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={tokenVisible ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setValidatedUser(null);
                    setTokenError(null);
                  }}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setTokenVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  {tokenVisible ? "Hide" : "Show"}
                </button>
              </div>
              <button onClick={handleValidateToken} disabled={validating} className="btn-primary whitespace-nowrap">
                {validating ? "Validating…" : "Validate"}
              </button>
            </div>
            {validatedUser && (
              <p className="text-emerald-400 text-sm mt-1.5">
                ✓ Authenticated as <span className="font-medium">@{validatedUser}</span>
              </p>
            )}
            {tokenError && <p className="text-red-400 text-sm mt-1.5">{tokenError}</p>}
            <p className="text-slate-500 text-xs mt-2">
              Requires scopes: <code className="text-slate-400">repo</code>,{" "}
              <code className="text-slate-400">read:user</code>. Token is stored locally and never sent anywhere except
              GitHub.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              GitHub Base URL
              <span className="ml-2 text-slate-500 font-normal">(for GitHub Enterprise)</span>
            </label>
            <input
              type="url"
              value={settings.baseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </section>

        {/* Polling Section */}
        <section className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Polling</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Refresh Interval</label>
            <select
              value={settings.pollingInterval}
              onChange={(e) => setSettings((s) => ({ ...s, pollingInterval: Number(e.target.value) }))}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {POLLING_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {(
            [
              { key: "ciCompletion", label: "CI check completed" },
              { key: "newComments", label: "New review comments" },
              { key: "approvals", label: "PR approved" },
              { key: "reviewRequests", label: "Review requested from you" },
              { key: "mergeConflicts", label: "Merge conflict detected" },
            ] as { key: keyof NotificationPreferences; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications[key]}
                onChange={(e) => updateNotification(key, e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </section>

        {/* Priority Keywords Section */}
        <section className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Priority Keywords</h2>
          <p className="text-slate-400 text-sm">
            Keywords found in comment bodies adjust priority scores. High adds +20, Medium +10, Low -10.
          </p>

          {(["high", "medium", "low"] as (keyof PriorityKeywords)[]).map((tier) => (
            <div key={tier}>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${tierColors[tier]}`}>
                {tier} priority
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {settings.priorityKeywords[tier].map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(tier, kw)}
                      className="text-slate-500 hover:text-red-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add keyword…"
                  value={keywordInput.tier === tier ? keywordInput.value : ""}
                  onChange={(e) => setKeywordInput({ tier, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addKeyword(tier, keywordInput.value);
                      setKeywordInput({ tier, value: "" });
                    }
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    addKeyword(tier, keywordInput.value);
                    setKeywordInput({ tier, value: "" });
                  }}
                  className="btn-ghost text-xs"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between pb-6">
          <button onClick={handleReset} className="text-sm text-slate-500 hover:text-red-400 transition-colors">
            Reset to defaults
          </button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-emerald-400 text-sm">Settings saved!</span>}
            <button onClick={handleSave} className="btn-primary px-5">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
