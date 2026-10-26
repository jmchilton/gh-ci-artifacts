import { describe, it, expect } from "vitest";
import {
  cleanLine,
  renderDigest,
  samePath,
  testsFromLog,
  testsFromPytestReport,
  type DigestData,
  type Failure,
} from "../src/digest.js";

const TRACEBACK = [
  "self = <galaxy.jobs.runners.pulsar.PulsarJobRunner object at 0x77e6a1adb7d0>",
  ">       ClientInput(path, object_store_ref=ref, url=url)",
  "E       TypeError: ClientInput.__init__() got an unexpected keyword argument 'url'",
  "",
  "lib/galaxy/jobs/runners/pulsar.py:782: TypeError",
].join("\n");

const INTEGRATION_LOG = [
  "------ Captured log call ------",
  "Traceback (most recent call last):",
  "TypeError: ClientInput.__init__() got an unexpected keyword argument 'url'",
  "lib/galaxy/tool_util/verify/interactor.py:1980: in verify_tool",
  "E   galaxy.tool_util.verify.interactor.JobOutputsError: Job in error state.. tool_id: cat1",
  "lib/galaxy/tool_util/verify/interactor.py:2155: JobOutputsError",
].join("\n");

describe("cleanLine", () => {
  it("strips Actions timestamps, ANSI codes, addresses and temp paths", () => {
    expect(
      cleanLine(
        "2026-10-26T20:33:29.5737540Z \x1b[31mFAILED\x1b[0m at 0x77e6a1dd7380 in /tmp/pytest-of-runner/x.py",
      ),
    ).toBe("FAILED at 0x… in /tmp/…");
  });

  it("truncates long lines", () => {
    expect(cleanLine("x".repeat(500))).toHaveLength(200);
  });
});

describe("testsFromPytestReport", () => {
  it("reads failed and errored tests with message, location and captured causes", () => {
    const tests = testsFromPytestReport({
      tests: [
        { nodeid: "t.py::ok", outcome: "passed" },
        { nodeid: "t.py::xf", outcome: "xfailed", log: TRACEBACK },
        { nodeid: "t.py::unit", outcome: "failed", log: TRACEBACK },
        { nodeid: "t.py::integration", outcome: "error", log: INTEGRATION_LOG },
      ],
    });
    expect(tests).toEqual([
      {
        id: "t.py::unit",
        message:
          "TypeError: ClientInput.__init__() got an unexpected keyword argument 'url'",
        location: "lib/galaxy/jobs/runners/pulsar.py:782: TypeError",
        causes: [],
      },
      {
        id: "t.py::integration",
        message: "JobOutputsError: Job in error state.. tool_id: cat1",
        location:
          "lib/galaxy/tool_util/verify/interactor.py:2155: JobOutputsError",
        causes: [
          "TypeError: ClientInput.__init__() got an unexpected keyword argument 'url'",
        ],
      },
    ]);
  });

  it("falls back to the outcome when there is no error line", () => {
    expect(
      testsFromPytestReport({
        tests: [{ nodeid: "t.py::e", outcome: "error" }],
      })[0].message,
    ).toBe("error");
  });
});

describe("testsFromLog", () => {
  const log = [
    "2026-10-26T20:23:53.5Z [gw1] [ 28%] FAILED test/a.py::test_progress_line",
    "2026-10-26T20:33:29.5Z =========================== short test summary info ============================",
    "2026-10-26T20:33:29.5Z FAILED test/a.py::test_one - TypeError: boom",
    "2026-10-26T20:33:29.5Z FAILED test/a.py::test_tools[a and b] - galaxy.util.FooError: bad",
    "2026-10-26T20:33:29.5Z ERROR test/b.py::test_setup",
    "2026-10-26T20:33:29.5Z FAILED test/a.py::test_one - TypeError: boom",
    "2026-10-26T20:33:29.5Z = 3 failed, 8789 passed, 205 skipped in 720.85s (0:12:00) =",
    "2026-10-26T20:33:30.0Z ##[error]Process completed with exit code 1.",
  ].join("\n");

  it("reads pytest's short summary and result line", () => {
    const parsed = testsFromLog(log);
    expect(parsed.tests.map((t) => [t.id, t.message])).toEqual([
      ["test/a.py::test_one", "TypeError: boom"],
      ["test/a.py::test_tools[a and b]", "FooError: bad"],
      ["test/b.py::test_setup", "error"],
    ]);
    expect(parsed.result).toBe(
      "3 failed, 8789 passed, 205 skipped in 720.85s (0:12:00)",
    );
  });

  it("keeps the lines up to the first error annotation for logs without tests", () => {
    const parsed = testsFromLog(
      [
        "##[group]Run make",
        "npm ERR! missing script: lint",
        "##[endgroup]",
        "##[error]Process completed with exit code 1.",
        "cleanup",
      ].join("\n"),
    );
    expect(parsed.tests).toEqual([]);
    expect(parsed.excerpt).toEqual([
      "npm ERR! missing script: lint",
      "##[error]Process completed with exit code 1.",
    ]);
  });
});

describe("samePath", () => {
  it("matches paths that share file name and parent directory", () => {
    expect(
      samePath(
        "lib/galaxy/jobs/runners/pulsar.py",
        "packages/app/galaxy/jobs/runners/pulsar.py",
      ),
    ).toBe(true);
    expect(
      samePath(
        "lib/galaxy/jobs/runners/pulsar.py",
        "lib/galaxy/jobs/handlers/pulsar.py",
      ),
    ).toBe(false);
    expect(samePath("setup.py", "packages/setup.py")).toBe(false);
    expect(samePath("setup.py", "setup.py")).toBe(true);
  });
});

describe("renderDigest", () => {
  function failure(
    id: string,
    message: string,
    source: string,
    extra: Partial<Failure["test"]> = {},
  ): Failure {
    return {
      test: { id, message, causes: [], ...extra },
      source,
      workflow: ".github/workflows/unit.yaml",
    };
  }

  const data: DigestData = {
    repo: "o/r",
    ref: "PR #7",
    headSha: "baeca0d7dc6ce8144de0",
    baseBranch: "dev",
    baseRuns: 3,
    prFiles: ["lib/galaxy/jobs/runners/pulsar.py", "test/unit/test_pulsar.py"],
    totalRuns: 4,
    passedRuns: 1,
    pending: ["API tests"],
    failedWithoutFailedJobs: ["CWL"],
    jobs: [
      {
        workflow: "Unit tests",
        name: "Test (3.14)",
        conclusion: "failure",
        url: "https://example/job/1",
        failedSteps: ["Run tests"],
        base: { failed: 1, total: 3 },
        result: "3 failed, 9 passed in 1.00s",
      },
    ],
    failures: [
      failure(
        "test/unit/test_pulsar.py::a",
        "TypeError: no url 1",
        "Unit results",
        {
          location: "lib/galaxy/jobs/runners/pulsar.py:782: TypeError",
        },
      ),
      failure(
        "test/unit/test_pulsar.py::b",
        "TypeError: no url 2",
        "Packages / Test (3.10)",
      ),
      failure(
        "test/unit/test_pulsar.py::a",
        "TypeError: no url 1",
        "Packages / Test (3.10)",
      ),
      failure(
        "test/unit/test_flaky.py::c",
        "AssertionError: timing",
        "Unit results",
      ),
    ],
    baseFailures: new Map([
      [".github/workflows/unit.yaml", new Set(["test/unit/test_flaky.py::c"])],
    ]),
    logExcerpts: [
      { source: "Lint / lint", lines: ["npm ERR! missing script"] },
    ],
  };

  it("groups failures by signature across sources and marks PR files and base failures", () => {
    expect(renderDigest(data)).toBe(
      [
        "CI digest: o/r PR #7 @ baeca0d7 vs dev",
        "PR files (2): lib/galaxy/jobs/runners/pulsar.py, test/unit/test_pulsar.py",
        "Runs: 4 (1 passed, 2 failed, 1 pending)",
        "Pending: API tests",
        "Failed runs with no failed job (setup/skips): CWL",
        "",
        "Failed jobs [dev: failed/completed in last 3 push runs]:",
        "- Unit tests / Test (3.14)  [dev: 1/3]  step: Run tests  (3 failed, 9 passed in 1.00s)",
        "  https://example/job/1",
        "",
        "Failing tests: 3 in 2 signatures",
        "#1 2 tests: TypeError: no url 1",
        "   at lib/galaxy/jobs/runners/pulsar.py:782: TypeError  [PR file]",
        "   from: Unit results; Packages / Test (3.10)",
        "   also failing on dev: 0/2",
        "   - test/unit/test_pulsar.py::a  [PR file]",
        "   - test/unit/test_pulsar.py::b  [PR file]",
        "#2 1 test: AssertionError: timing",
        "   from: Unit results",
        "   also failing on dev: 1/1",
        "   - test/unit/test_flaky.py::c  [fails on dev]",
        "",
        "No test failures parsed from Lint / lint; log before the error:",
        "  | npm ERR! missing script",
        "",
      ].join("\n"),
    );
  });

  it("caps tests per group and groups", () => {
    const many = {
      ...data,
      failures: data.failures.slice(0, 2),
      logExcerpts: [],
    };
    const text = renderDigest(many, { testsPerGroup: 1, groups: 1 });
    expect(text).toContain(
      "   - test/unit/test_pulsar.py::a  [PR file]\n   - +1 more\n",
    );
  });

  it("reports when nothing failed", () => {
    const text = renderDigest({
      ...data,
      jobs: [],
      failures: [],
      pending: [],
      failedWithoutFailedJobs: [],
    });
    expect(text.trim().split("\n").at(-1)).toBe("No failures.");
  });
});
