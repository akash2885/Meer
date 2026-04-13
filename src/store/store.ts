import { create } from "zustand";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../lib/constants";
import { createClient } from "../lib/github";
import type { PRDashStore, Settings, PullRequest } from "../lib/types";

/**
 * Read a value from chrome.storage.local. Falls back to defaultValue if not found.
 */
async function storageGet<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(key in result ? (result[key] as T) : defaultValue);
    });
  });
}

/**
 * Write a value to chrome.storage.local.
 */
async function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Hydrate store from chrome.storage.local. Called once on initialization.
 */
export async function hydrateStore(): Promise<Partial<PRDashStore>> {
  const [settings, pullRequests, lastFetched, currentUser] = await Promise.all([
    storageGet<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
    storageGet<PullRequest[]>(STORAGE_KEYS.pullRequests, []),
    storageGet<number | null>(STORAGE_KEYS.lastFetched, null),
    storageGet<string | null>(STORAGE_KEYS.currentUser, null),
  ]);

  return { settings, pullRequests, lastFetched, currentUser };
}

export const useStore = create<PRDashStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  settings: DEFAULT_SETTINGS,
  pullRequests: [],
  lastFetched: null,
  isLoading: false,
  error: null,
  currentUser: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  fetchPRs: async () => {
    const { settings } = get();

    if (!settings.token) {
      set({ error: "No GitHub token configured. Please add one in settings." });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const client = createClient(settings);

      // Get/refresh current user
      let currentUser = get().currentUser;
      if (!currentUser) {
        currentUser = await client.getCurrentUser();
        set({ currentUser });
        await storageSet(STORAGE_KEYS.currentUser, currentUser);
      }

      const pullRequests = await client.fetchPullRequests(currentUser, settings.priorityKeywords);
      const lastFetched = Date.now();

      set({ pullRequests, lastFetched, isLoading: false });

      // Persist to storage
      await Promise.all([
        storageSet(STORAGE_KEYS.pullRequests, pullRequests),
        storageSet(STORAGE_KEYS.lastFetched, lastFetched),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching PRs";
      set({ isLoading: false, error: message });
    }
  },

  updateSettings: (partial: Partial<Settings>) => {
    const current = get().settings;
    const updated = deepMergeSettings(current, partial);
    set({ settings: updated });
    // Persist asynchronously — fire and forget in the popup
    storageSet(STORAGE_KEYS.settings, updated).catch(console.error);
  },

  clearData: () => {
    set({
      pullRequests: [],
      lastFetched: null,
      error: null,
      currentUser: null,
    });
    chrome.storage.local.remove([
      STORAGE_KEYS.pullRequests,
      STORAGE_KEYS.lastFetched,
      STORAGE_KEYS.currentUser,
    ]);
  },

  setCurrentUser: (login: string) => {
    set({ currentUser: login });
    storageSet(STORAGE_KEYS.currentUser, login).catch(console.error);
  },
}));

/**
 * Deep merge settings, preserving nested objects like notifications and priorityKeywords.
 */
function deepMergeSettings(current: Settings, partial: Partial<Settings>): Settings {
  return {
    ...current,
    ...partial,
    notifications: {
      ...current.notifications,
      ...(partial.notifications ?? {}),
    },
    priorityKeywords: {
      ...current.priorityKeywords,
      ...(partial.priorityKeywords ?? {}),
    },
  };
}
