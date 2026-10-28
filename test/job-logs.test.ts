import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import { getJobLogs } from "../src/github/api.js";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

const mocked = vi.mocked(execSync);

describe("getJobLogs", () => {
  beforeEach(() => mocked.mockReset());

  it("retries with --allow-escape-sequences when gh refuses raw log output", () => {
    mocked
      .mockImplementationOnce(() => {
        throw new Error(
          "the response contains terminal escape sequences; pass --allow-escape-sequences to output it anyway",
        );
      })
      .mockImplementationOnce(() => "log text");

    expect(getJobLogs("o/r", "7")).toBe("log text");
    expect(mocked.mock.calls[1][0]).toBe(
      "gh api --allow-escape-sequences repos/o/r/actions/jobs/7/logs",
    );
  });

  it("does not retry other failures", () => {
    mocked.mockImplementationOnce(() => {
      throw new Error("HTTP 404");
    });
    expect(() => getJobLogs("o/r", "7")).toThrow(/HTTP 404/);
    expect(mocked.mock.calls).toHaveLength(1);
  });
});
