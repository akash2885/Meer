import { vi } from "vitest";

/**
 * Full mock of the chrome extension APIs used by PRDash.
 * Installed globally in tests/setup.ts.
 */

const storageData: Record<string, unknown> = {};

export const chromeMock = {
  storage: {
    local: {
      get: vi.fn((key: string | string[], callback: (result: Record<string, unknown>) => void) => {
        if (typeof key === "string") {
          const result: Record<string, unknown> = {};
          if (key in storageData && storageData[key] !== undefined) {
            result[key] = storageData[key];
          }
          callback(result);
        } else {
          const result: Record<string, unknown> = {};
          for (const k of key) {
            if (k in storageData && storageData[k] !== undefined) {
              result[k] = storageData[k];
            }
          }
          callback(result);
        }
      }),
      set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
        Object.assign(storageData, items);
        callback?.();
      }),
      remove: vi.fn((keys: string | string[], callback?: () => void) => {
        if (typeof keys === "string") {
          delete storageData[keys];
        } else {
          for (const k of keys) delete storageData[k];
        }
        callback?.();
      }),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn((_name: string, callback?: () => void) => callback?.()),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  runtime: {
    openOptionsPage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({}),
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
  },
};

/** Reset all mock call history and storage state between tests. */
export function resetChromeMocks() {
  // Clear stored data
  for (const key of Object.keys(storageData)) {
    delete storageData[key];
  }
  // Reset all vi.fn calls
  for (const group of Object.values(chromeMock)) {
    if (typeof group === "object" && group !== null) {
      for (const fn of Object.values(group)) {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
  // Re-attach default implementations after reset
  (chromeMock.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string | string[], callback: (result: Record<string, unknown>) => void) => {
      if (typeof key === "string") {
        const result: Record<string, unknown> = {};
        if (key in storageData && storageData[key] !== undefined) result[key] = storageData[key];
        callback(result);
      } else {
        const result: Record<string, unknown> = {};
        for (const k of key) {
          if (k in storageData && storageData[k] !== undefined) result[k] = storageData[k];
        }
        callback(result);
      }
    }
  );
  (chromeMock.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(
    (items: Record<string, unknown>, callback?: () => void) => {
      Object.assign(storageData, items);
      callback?.();
    }
  );
  (chromeMock.storage.local.remove as ReturnType<typeof vi.fn>).mockImplementation(
    (keys: string | string[], callback?: () => void) => {
      if (typeof keys === "string") delete storageData[keys];
      else for (const k of keys) delete storageData[k];
      callback?.();
    }
  );
  (chromeMock.alarms.clear as ReturnType<typeof vi.fn>).mockImplementation(
    (_name: string, callback?: () => void) => callback?.()
  );
  (chromeMock.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({});
}
