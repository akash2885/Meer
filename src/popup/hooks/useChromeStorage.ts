import { useEffect, useRef } from "react";
import { useStore, hydrateStore } from "../../store/store";

/**
 * On mount, hydrate the Zustand store from chrome.storage.local so the popup
 * immediately shows cached data, then trigger a background refresh.
 */
export function useChromeStorage() {
  const hydrated = useRef(false);
  const { settings, fetchPRs } = useStore();

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    hydrateStore().then((data) => {
      useStore.setState(data);
      // After hydration, refresh in background if token is set
      if (data.settings?.token) {
        fetchPRs();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for storage changes from the service worker
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const state: Partial<ReturnType<typeof useStore.getState>> = {};

      if (changes["prdash_pull_requests"]) {
        state.pullRequests = changes["prdash_pull_requests"].newValue ?? [];
      }
      if (changes["prdash_last_fetched"]) {
        state.lastFetched = changes["prdash_last_fetched"].newValue ?? null;
      }
      if (changes["prdash_current_user"]) {
        state.currentUser = changes["prdash_current_user"].newValue ?? null;
      }

      if (Object.keys(state).length > 0) {
        useStore.setState(state);
      }
    };

    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  return { settings };
}
