import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  timeAgo,
  truncate,
  maskToken,
  deduplicateBy,
  safeJsonParse,
  clamp,
  containsKeyword,
  generateCommentId,
} from "../../src/lib/utils";

const NOW = new Date("2026-04-13T12:00:00Z").getTime();

beforeEach(() => {
  vi.setSystemTime(NOW);
});

describe("timeAgo", () => {
  it("returns 'just now' for less than 60 seconds ago", () => {
    expect(timeAgo(new Date(NOW - 30 * 1000))).toBe("just now");
  });
  it("returns minutes for < 1 hour", () => {
    expect(timeAgo(new Date(NOW - 5 * 60 * 1000))).toBe("5m ago");
  });
  it("returns hours for < 24 hours", () => {
    expect(timeAgo(new Date(NOW - 3 * 3600 * 1000))).toBe("3h ago");
  });
  it("returns days for < 1 week", () => {
    expect(timeAgo(new Date(NOW - 2 * 86400 * 1000))).toBe("2d ago");
  });
  it("returns weeks for >= 1 week", () => {
    expect(timeAgo(new Date(NOW - 10 * 86400 * 1000))).toBe("1w ago");
  });
});

describe("truncate", () => {
  it("does not truncate strings within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates strings that exceed limit", () => {
    const result = truncate("hello world this is a test", 10);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(11); // 10 chars + ellipsis
  });
  it("handles exactly-limit length strings", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("maskToken", () => {
  it("masks most of the token", () => {
    const masked = maskToken("ghp_abcdefghij");
    expect(masked.startsWith("ghp_")).toBe(true);
    expect(masked).toContain("*");
  });
  it("returns empty string for empty input", () => {
    expect(maskToken("")).toBe("");
  });
  it("returns **** for very short token", () => {
    expect(maskToken("abc")).toBe("****");
  });
});

describe("deduplicateBy", () => {
  it("removes duplicates by key", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "a" }];
    const result = deduplicateBy(items, (i) => i.id);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["a", "b"]);
  });
  it("returns empty array for empty input", () => {
    expect(deduplicateBy([], (i: { id: string }) => i.id)).toEqual([]);
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it("returns null for invalid JSON", () => {
    expect(safeJsonParse("not json")).toBeNull();
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("returns min when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("returns max when above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("containsKeyword", () => {
  it("finds keyword case-insensitively", () => {
    expect(containsKeyword("Fix the BUG", "bug")).toBe(true);
    expect(containsKeyword("Fix the BUG", "BUG")).toBe(true);
  });
  it("returns false when keyword not present", () => {
    expect(containsKeyword("looks good", "bug")).toBe(false);
  });
});

describe("generateCommentId", () => {
  it("returns URL when URL is provided", () => {
    expect(generateCommentId("https://github.com/org/repo/pull/1#c1", "body")).toBe(
      "https://github.com/org/repo/pull/1#c1"
    );
  });
  it("generates stable id from body when URL is empty", () => {
    const id1 = generateCommentId("", "same body");
    const id2 = generateCommentId("", "same body");
    expect(id1).toBe(id2);
    expect(id1.startsWith("comment-")).toBe(true);
  });
});
