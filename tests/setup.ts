import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";
import { chromeMock, resetChromeMocks } from "./mocks/chrome";

// Install chrome global mock
(globalThis as unknown as Record<string, unknown>).chrome = chromeMock;

// Reset mocks before each test
beforeEach(() => {
  resetChromeMocks();
  vi.clearAllMocks();
});
