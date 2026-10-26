import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { collectDigest, writeDigest } from "../src/digest.js";
import { Logger } from "../src/utils/logger.js";
import type { CatalogEntry, PRSummary, RunSummary } from "../src/types.js";
import type { JobWithSteps } from "../src/github/api.js";

const JOBS: Record<string, JobWithSteps[]> = {
  "1": [
    {
      id: "11",
      name: "Test (3.14)",
      conclusion: "failure",
      html_url: "u/11",
      steps: ["Run tests"],
    },
  ],
  "2": [
    {
      id: "21",
      name: "Test (3.10)",
      conclusion: "failure",
      html_url: "u/21",
      steps: ["Run tests"],
    },
  ],
  "3": [
    {
      id: "31",
      name: "lint",
      conclusion: "failure",
      html_url: "u/31",
      steps: ["Lint"],
    },
  ],
  "4": [
    {
      id: "41",
      name: "cwl",
      conclusion: "skipped",
      html_url: "u/41",
      steps: [],
    },
  ],
  "5": [
    {
      id: "51",
      name: "API (0)",
      conclusion: "failure",
      html_url: "u/51",
      steps: ["Run tests"],
    },
    {
      id: "52",
      name: "API (1)",
      conclusion: null,
      html_url: "u/52",
      steps: [],
    },
  ],
  base1: [
    {
      id: "b11",
      name: "Test (3.14)",
      conclusion: "failure",
      html_url: "",
      steps: [],
    },
  ],
  base2: [
    {
      id: "b12",
      name: "Test (3.14)",
      conclusion: "success",
      html_url: "",
      steps: [],
    },
  ],
};

const LOGS: Record<string, string> = {
  "31": "npm ERR! missing script: lint\n##[error]Process completed with exit code 1.",
  "51": "FAILED test/api/test_jobs.py::test_one - AssertionError: 500 != 200\n= 1 failed, 9 passed in 3.00s =",
  b11: "FAILED test/unit/test_flaky.py::test_timing - AssertionError: slow",
};

vi.mock("../src/github/api.js", () => ({
  getPRDetails: () => ({
    baseRefName: "dev",
    files: ["lib/galaxy/jobs/runners/pulsar.py"],
  }),
  getJobsWithSteps: (_repo: string, runId: string) => JOBS[runId] ?? [],
  getBaseBranchRuns: (_repo: string, file: string) =>
    file === "unit.yaml" ? ["base1", "base2"] : [],
  getJobLogs: (_repo: string, jobId: string) => LOGS[jobId] ?? "",
}));

function run(
  runId: string,
  workflowName: string,
  conclusion: RunSummary["conclusion"],
  logs: RunSummary["logs"] = [],
): RunSummary {
  return {
    runId,
    workflowName,
    workflowPath: `.github/workflows/${workflowName.toLowerCase().replace(/ /g, "-")}.yaml`,
    runAttempt: 1,
    runNumber: 1,
    conclusion,
    artifacts: [],
    logs,
  };
}

describe("collectDigest", () => {
  const dir = mkdtempSync(join(tmpdir(), "digest-"));
  const report = join(dir, "report.json");
  writeFileSync(
    report,
    JSON.stringify({
      tests: [
        {
          nodeid: "test/unit/test_flaky.py::test_timing",
          outcome: "failed",
          log: "E   AssertionError: slow",
        },
        { nodeid: "test/unit/test_ok.py::test_x", outcome: "passed" },
      ],
    }),
  );
  const packagesLog = join(dir, "packages.log");
  writeFileSync(
    packagesLog,
    "FAILED tests/app/test_pulsar.py::test_url - TypeError: unexpected 'url'\n",
  );

  const unit = run("1", "Unit", "failure");
  unit.workflowPath = ".github/workflows/unit.yaml";
  const summary: PRSummary = {
    mode: "pr",
    pr: 7,
    prBranch: "feature",
    repo: "o/r",
    headSha: "abcdef1234567890",
    analyzedAt: "",
    status: "complete",
    inProgressRuns: 1,
    catalogFile: "",
    versions: { "gh-ci-artifacts": "", "artifact-detective": "" },
    stats: {
      totalRuns: 7,
      artifactsDownloaded: 0,
      artifactsFailed: 0,
      logsExtracted: 0,
      htmlConverted: 0,
      artifactsValidated: 0,
      artifactsInvalid: 0,
      linterOutputsExtracted: 0,
    },
    runs: [
      run("0", "Docs", "success"),
      unit,
      run("2", "Packages", "failure", [
        {
          jobName: "Test (3.10)",
          jobId: "21",
          extractionStatus: "success",
          logFile: packagesLog,
        },
      ]),
      run("3", "Lint", "failure"),
      run("4", "CWL", "failure"),
      run("5", "API", "in_progress"),
    ],
  };
  const catalog: CatalogEntry[] = [
    {
      artifactName: "Unit results",
      artifactId: 1,
      runId: "1",
      detectedType: "pytest-html",
      originalFormat: "html",
      filePath: report,
      converted: true,
    },
    {
      artifactName: "seed",
      artifactId: 2,
      runId: "1",
      detectedType: "unknown",
      originalFormat: "json",
      filePath: report,
    },
  ];

  it("collects jobs, tests, pending runs and base-branch failures", () => {
    const data = collectDigest(summary, catalog, new Logger(false));

    expect(data).toMatchObject({
      ref: "PR #7",
      baseBranch: "dev",
      baseRuns: 3,
      totalRuns: 6,
      passedRuns: 1,
      pending: ["API"],
      failedWithoutFailedJobs: ["CWL"],
    });
    expect(data.jobs.map((j) => [j.workflow, j.name, j.base])).toEqual([
      ["Unit", "Test (3.14)", { failed: 1, total: 2 }],
      ["Packages", "Test (3.10)", { failed: 0, total: 0 }],
      ["Lint", "lint", { failed: 0, total: 0 }],
      ["API", "API (0)", { failed: 0, total: 0 }],
    ]);
    expect(data.failures.map((f) => [f.source, f.test.id])).toEqual([
      ["Unit results", "test/unit/test_flaky.py::test_timing"],
      ["Packages / Test (3.10)", "tests/app/test_pulsar.py::test_url"],
      ["API / API (0)", "test/api/test_jobs.py::test_one"],
    ]);
    expect(data.jobs.map((j) => j.result)).toEqual([
      undefined,
      undefined,
      undefined,
      "1 failed, 9 passed in 3.00s",
    ]);
    expect(data.baseFailures.get(".github/workflows/unit.yaml")).toEqual(
      new Set(["test/unit/test_flaky.py::test_timing"]),
    );
    expect(data.logExcerpts).toEqual([
      {
        source: "Lint / lint",
        lines: [
          "npm ERR! missing script: lint",
          "##[error]Process completed with exit code 1.",
        ],
      },
    ]);
  });

  it("skips the base comparison when asked", () => {
    const data = collectDigest(summary, catalog, new Logger(false), {
      baseRuns: 0,
    });
    expect(data.baseFailures.size).toBe(0);
    expect(data.jobs.every((j) => j.base === undefined)).toBe(true);
  });

  it("writes digest.txt", () => {
    const text = writeDigest(dir, summary, catalog, new Logger(false));
    expect(readFileSync(join(dir, "digest.txt"), "utf-8")).toBe(text);
    expect(text).toContain(
      "   - test/unit/test_flaky.py::test_timing  [fails on dev]",
    );
  });
});
