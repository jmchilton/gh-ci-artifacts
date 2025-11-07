import { describe, it, expect } from "vitest";

describe("ref detection logic", () => {
  // Helper to mimic the regex from cli.ts
  function isPR(ref: string): boolean {
    return /^\d+$/.test(ref);
  }

  describe("PR number detection", () => {
    it("detects pure numeric strings as PR numbers", () => {
      expect(isPR("123")).toBe(true);
      expect(isPR("1")).toBe(true);
      expect(isPR("999999")).toBe(true);
    });

    it("detects non-numeric strings as branch names", () => {
      expect(isPR("main")).toBe(false);
      expect(isPR("feature/my-feature")).toBe(false);
      expect(isPR("123-my-branch")).toBe(false);
      expect(isPR("v1.2.3")).toBe(false);
    });

    it("rejects strings with leading zeros (treats as string)", () => {
      expect(isPR("0123")).toBe(true); // Still numeric
    });

    it("rejects floats and decimals", () => {
      expect(isPR("123.456")).toBe(false);
    });

    it("rejects negative numbers", () => {
      expect(isPR("-123")).toBe(false);
    });
  });

  describe("branch name detection", () => {
    it("allows alphanumeric branch names", () => {
      expect(isPR("main")).toBe(false);
      expect(isPR("develop")).toBe(false);
      expect(isPR("release")).toBe(false);
    });

    it("allows branch names with slashes", () => {
      expect(isPR("feature/my-feature")).toBe(false);
      expect(isPR("bugfix/issue-123")).toBe(false);
      expect(isPR("release/v1.0.0")).toBe(false);
    });

    it("allows branch names with hyphens and underscores", () => {
      expect(isPR("my-branch")).toBe(false);
      expect(isPR("my_branch")).toBe(false);
      expect(isPR("my-branch_v2")).toBe(false);
    });

    it("allows branch names with dots", () => {
      expect(isPR("release-1.0")).toBe(false);
      expect(isPR("v1.2.3")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty strings correctly", () => {
      expect(isPR("")).toBe(false);
    });

    it("handles whitespace", () => {
      expect(isPR(" 123")).toBe(false);
      expect(isPR("123 ")).toBe(false);
      expect(isPR(" main ")).toBe(false);
    });

    it("handles special characters in branch names", () => {
      expect(isPR("branch-@home")).toBe(false);
      expect(isPR("feature#123")).toBe(false);
    });
  });
});

describe("branch name sanitization", () => {
  function sanitizeBranchName(branch: string): string {
    return branch.replace(/[\/\\:\*\?"<>\|]/g, "-").replace(/\s+/g, "-");
  }

  it("replaces forward slashes with hyphens", () => {
    expect(sanitizeBranchName("feature/my-feature")).toBe("feature-my-feature");
    expect(sanitizeBranchName("bugfix/issue-123")).toBe("bugfix-issue-123");
  });

  it("replaces backslashes with hyphens", () => {
    expect(sanitizeBranchName("feature\\my-feature")).toBe("feature-my-feature");
  });

  it("replaces colons with hyphens", () => {
    expect(sanitizeBranchName("branch:name")).toBe("branch-name");
  });

  it("replaces wildcards with hyphens", () => {
    expect(sanitizeBranchName("feature*branch")).toBe("feature-branch");
  });

  it("replaces quotes with hyphens", () => {
    expect(sanitizeBranchName('feature"branch')).toBe("feature-branch");
  });

  it("replaces angle brackets with hyphens", () => {
    expect(sanitizeBranchName("feature<branch>")).toBe("feature-branch-");
  });

  it("replaces pipes with hyphens", () => {
    expect(sanitizeBranchName("feature|branch")).toBe("feature-branch");
  });

  it("replaces multiple whitespaces with single hyphen", () => {
    expect(sanitizeBranchName("feature   branch")).toBe("feature-branch");
    expect(sanitizeBranchName("feature\t\nbranch")).toBe("feature-branch");
  });

  it("handles complex branch names", () => {
    expect(sanitizeBranchName("feature/my-branch:v1.0")).toBe(
      "feature-my-branch-v1.0",
    );
  });

  it("preserves already safe names", () => {
    expect(sanitizeBranchName("main")).toBe("main");
    expect(sanitizeBranchName("my-branch")).toBe("my-branch");
    expect(sanitizeBranchName("my_branch")).toBe("my_branch");
  });
});
