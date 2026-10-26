import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import {
  downloadArtifact,
  getArtifactsForRun,
  getBaseBranchRuns,
  getBranchHeadSha,
  getJobsForRun,
  getJobsWithSteps,
  getPRDetails,
  getPRHeadSha,
  getWorkflowRunsForBranch,
  getWorkflowRunsForBranchPush,
  getWorkflowRunsForCommit,
} from "../src/github/api.js";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

const mocked = vi.mocked(execSync);

function returns(output: string): void {
  mocked.mockImplementationOnce(() => output);
}

function fails(message: string): void {
  mocked.mockImplementationOnce(() => {
    throw new Error(message);
  });
}

function command(): string {
  return String(mocked.mock.calls.at(-1)![0]);
}

const ndjson = (rows: object[]) =>
  rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

describe("github api", () => {
  beforeEach(() => mocked.mockReset());

  it("reads PR head and branch head SHAs", () => {
    returns(JSON.stringify({ headRefOid: "abc", headRefName: "feature" }));
    expect(getPRHeadSha("o/r", 7)).toBe("abc");
    expect(command()).toBe(
      "gh pr view 7 --repo o/r --json headRefOid,headRefName",
    );
    returns("def\n");
    expect(getBranchHeadSha("o/r", "main")).toBe("def");
    fails("HTTP 404");
    expect(() => getBranchHeadSha("o/r", "gone")).toThrow(
      /branch info for 'gone'.*HTTP 404/,
    );
  });

  it("keeps only the latest attempt of each workflow", () => {
    const rows = [
      {
        id: 1,
        name: "CI",
        path: "ci.yml",
        run_attempt: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "CI",
        path: "ci.yml",
        run_attempt: 2,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 3,
        name: "Lint",
        path: "lint.yml",
        run_attempt: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 4,
        name: "Lint",
        path: "lint.yml",
        run_attempt: 1,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    for (const fetch of [
      getWorkflowRunsForBranch,
      getWorkflowRunsForBranchPush,
    ]) {
      returns(ndjson(rows));
      expect(
        fetch("o/r", "feature", "sha")
          .map((r) => r.id)
          .sort(),
      ).toEqual([2, 4]);
    }
    returns(ndjson(rows));
    expect(
      getWorkflowRunsForCommit("o/r", "sha")
        .map((r) => r.id)
        .sort(),
    ).toEqual([2, 4]);
    fails("boom");
    expect(() => getWorkflowRunsForCommit("o/r", "sha")).toThrow(
      /workflow runs: boom/,
    );
  });

  it("lists artifacts and jobs", () => {
    returns(JSON.stringify([{ id: 9, name: "results", size_in_bytes: 1 }]));
    expect(getArtifactsForRun("o/r", "5")).toEqual([
      { id: 9, name: "results", size_in_bytes: 1 },
    ]);
    returns(
      ndjson([
        {
          id: "1",
          name: "test",
          conclusion: "failure",
          status: "completed",
          started_at: null,
        },
      ]),
    );
    expect(getJobsForRun("o/r", "5").map((j) => j.name)).toEqual(["test"]);
    returns(
      ndjson([
        {
          id: "1",
          name: "test",
          conclusion: "failure",
          html_url: "u",
          steps: ["Run tests"],
        },
      ]),
    );
    expect(getJobsWithSteps("o/r", "5")).toEqual([
      {
        id: "1",
        name: "test",
        conclusion: "failure",
        html_url: "u",
        steps: ["Run tests"],
      },
    ]);
    expect(command()).toContain("repos/o/r/actions/runs/5/jobs?per_page=100");
    fails("boom");
    expect(() => getJobsWithSteps("o/r", "5")).toThrow(/jobs for run 5: boom/);
  });

  it("reads PR base branch and files", () => {
    returns(JSON.stringify({ baseRefName: "dev", files: ["a.py"] }));
    expect(getPRDetails("o/r", 7)).toEqual({
      baseRefName: "dev",
      files: ["a.py"],
    });
    fails("boom");
    expect(() => getPRDetails("o/r", 7)).toThrow(/PR details: boom/);
  });

  it("lists completed base-branch push runs of a workflow", () => {
    returns("11\n12\n");
    expect(getBaseBranchRuns("o/r", "unit.yaml", "release_26.1", 2)).toEqual([
      "11",
      "12",
    ]);
    expect(command()).toBe(
      "gh api 'repos/o/r/actions/workflows/unit.yaml/runs?branch=release_26.1&event=push&status=completed&per_page=2' --jq '.workflow_runs[].id'",
    );
    fails("boom");
    expect(() => getBaseBranchRuns("o/r", "unit.yaml", "dev", 2)).toThrow(
      /dev runs of unit.yaml: boom/,
    );
  });

  it("downloads an artifact by name", () => {
    returns("");
    downloadArtifact("o/r", "5", "results", 9, "/out", true);
    expect(command()).toBe(
      'gh run download 5 --repo o/r --name "results" --dir "/out"',
    );
    fails("expired");
    expect(() => downloadArtifact("o/r", "5", "results", 9, "/out")).toThrow(
      /"results": expired/,
    );
  });
});
