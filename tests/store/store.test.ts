import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/lib/constants";

// We need to mock the github module before importing the store
vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    getCurrentUser: vi.fn().mockResolvedValue("testuser"),
    fetchPullRequests: vi.fn().mockResolvedValue([]),
  })),
}));

// Import after mocks are set up
const { useStore, hydrateStore } = await import("../../src/store/store");

describe("useStore", () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      settings: DEFAULT_SETTINGS,
      pullRequests: [],
      lastFetched: null,
      isLoading: false,
      error: null,
      currentUser: null,
    });
  });

  it("initializes with correct default state", () => {
    const state = useStore.getState();
    expect(state.pullRequests).toEqual([]);
    expect(state.lastFetched).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.settings).toMatchObject(DEFAULT_SETTINGS);
  });

  it("sets isLoading true then false during fetchPRs", async () => {
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, token: "ghp_test" } });

    const loadingStates: boolean[] = [];
    const unsub = useStore.subscribe((s) => loadingStates.push(s.isLoading));

    await useStore.getState().fetchPRs();
    unsub();

    expect(loadingStates).toContain(true);
    expect(loadingStates[loadingStates.length - 1]).toBe(false);
  });

  it("skips fetch and sets error when token is missing", async () => {
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, token: "" } });
    await useStore.getState().fetchPRs();
    const state = useStore.getState();
    expect(state.error).toContain("token");
    expect(state.isLoading).toBe(false);
  });

  it("populates pullRequests after successful fetch", async () => {
    const { createClient } = await import("../../src/lib/github");
    const mockPRs = [{ id: "PR_1", title: "Test PR" }];
    (createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      getCurrentUser: vi.fn().mockResolvedValue("testuser"),
      fetchPullRequests: vi.fn().mockResolvedValue(mockPRs),
    });

    useStore.setState({ settings: { ...DEFAULT_SETTINGS, token: "ghp_test" } });
    await useStore.getState().fetchPRs();

    expect(useStore.getState().pullRequests).toEqual(mockPRs);
    expect(useStore.getState().lastFetched).not.toBeNull();
  });

  it("sets error on fetch failure", async () => {
    const { createClient } = await import("../../src/lib/github");
    (createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      getCurrentUser: vi.fn().mockRejectedValue(new Error("Network error")),
      fetchPullRequests: vi.fn(),
    });

    useStore.setState({ settings: { ...DEFAULT_SETTINGS, token: "ghp_test" } });
    await useStore.getState().fetchPRs();

    expect(useStore.getState().error).toBe("Network error");
    expect(useStore.getState().isLoading).toBe(false);
  });

  it("updateSettings merges partial settings correctly", () => {
    useStore.getState().updateSettings({ pollingInterval: 120 });
    const state = useStore.getState();
    expect(state.settings.pollingInterval).toBe(120);
    // Other settings preserved
    expect(state.settings.baseUrl).toBe(DEFAULT_SETTINGS.baseUrl);
  });

  it("updateSettings merges nested notifications correctly", () => {
    useStore.getState().updateSettings({
      notifications: { ...DEFAULT_SETTINGS.notifications, ciCompletion: false },
    });

    const state = useStore.getState();
    expect(state.settings.notifications.ciCompletion).toBe(false);
    // Other notification settings preserved
    expect(state.settings.notifications.newComments).toBe(DEFAULT_SETTINGS.notifications.newComments);
  });

  it("clearData resets pullRequests, lastFetched, currentUser, error", () => {
    useStore.setState({
      pullRequests: [{ id: "PR_1" } as unknown as import("../../src/lib/types").PullRequest],
      lastFetched: 123456,
      currentUser: "testuser",
      error: "some error",
    });

    useStore.getState().clearData();

    const state = useStore.getState();
    expect(state.pullRequests).toEqual([]);
    expect(state.lastFetched).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.error).toBeNull();
  });

  it("persists settings to chrome.storage.local on updateSettings", () => {
    useStore.getState().updateSettings({ pollingInterval: 300 });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ prdash_settings: expect.objectContaining({ pollingInterval: 300 }) }),
      expect.any(Function)
    );
  });
});

describe("hydrateStore", () => {
  it("returns defaults when storage is empty", async () => {
    const state = await hydrateStore();
    expect(state.settings).toMatchObject(DEFAULT_SETTINGS);
    expect(state.pullRequests).toEqual([]);
    expect(state.lastFetched).toBeNull();
    expect(state.currentUser).toBeNull();
  });

  it("returns stored values from chrome.storage.local", async () => {
    const stored = { ...DEFAULT_SETTINGS, pollingInterval: 300 };
    chrome.storage.local.set({ prdash_settings: stored });

    const state = await hydrateStore();
    expect(state.settings?.pollingInterval).toBe(300);
  });
});
