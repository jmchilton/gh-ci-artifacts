/**
 * Compact plain-text failure digest for agents: failed jobs, failing tests
 * grouped by error signature, matches against the PR's files, and whether the
 * same jobs and tests also fail on recent base-branch runs.
 */

import { readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import type { CatalogEntry, Summary } from "./types.js";
import {
  getBaseBranchRuns,
  getJobLogs,
  getJobsWithSteps,
  getPRDetails,
} from "./github/api.js";
import type { Logger } from "./utils/logger.js";

export interface FailedTest {
  id: string;
  /** First error line, cleaned. */
  message: string;
  /** Innermost `path.py:NN: ExcType` line, when the report has a traceback. */
  location?: string;
  /** Exception lines from captured output, which name the cause when the assertion doesn't. */
  causes: string[];
}

export interface Failure {
  test: FailedTest;
  /** Artifact name or "workflow / job". */
  source: string;
  workflow: string;
}

export interface DigestJob {
  workflow: string;
  name: string;
  conclusion: string;
  url: string;
  failedSteps: string[];
  /** pytest's result line, when read from the job log. */
  result?: string;
  base?: { failed: number; total: number };
}

export interface DigestData {
  repo: string;
  ref: string;
  headSha: string;
  baseBranch?: string;
  baseRuns: number;
  prFiles?: string[];
  totalRuns: number;
  passedRuns: number;
  pending: string[];
  failedWithoutFailedJobs: string[];
  jobs: DigestJob[];
  failures: Failure[];
  /** Tests seen failing on recent base runs, keyed by workflow. */
  baseFailures: Map<string, Set<string>>;
  /** Failed jobs with no parseable test failures: the log lines around the error. */
  logExcerpts: Array<{ source: string; lines: string[] }>;
}

export interface DigestLimits {
  testsPerGroup: number;
  groups: number;
}

const DEFAULT_LIMITS: DigestLimits = { testsPerGroup: 5, groups: 12 };
const MAX_LINE = 200;
const EXCEPTION_LINE =
  /^([A-Za-z_][\w.]*(?:Error|Exception|Exit|Failure))(?::\s?(.*))?$/;

/** Strips Actions timestamps, ANSI codes, addresses and temp paths, then truncates. */
export function cleanLine(line: string): string {
  const cleaned = line
    .replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, "")
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/0x[0-9a-f]{6,}/gi, "0x…")
    .replace(/\/tmp\/[^\s'")\],]+/g, "/tmp/…")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > MAX_LINE
    ? cleaned.slice(0, MAX_LINE - 1) + "…"
    : cleaned;
}

/** Drops a dotted module prefix from a leading exception name. */
function shortException(message: string): string {
  return message.replace(
    /^(?:[a-z_][\w]*\.)+(?=[A-Z]\w*(?:Error|Exception|Exit|Failure)\b)/,
    "",
  );
}

function causesIn(lines: string[], message: string): string[] {
  const causes: string[] = [];
  for (const raw of lines) {
    if (/^E\s/.test(raw)) continue;
    const line = cleanLine(raw);
    if (EXCEPTION_LINE.test(line)) {
      const short = shortException(line);
      if (short !== message) causes.push(short);
    }
  }
  return causes;
}

/** Failed and errored tests from a pytest JSON report (pytest-json-report or converted pytest-html). */
export function testsFromPytestReport(report: {
  tests?: Array<{
    nodeid: string;
    outcome: string;
    log?: string;
    call?: { longrepr?: string };
  }>;
}): FailedTest[] {
  const failed: FailedTest[] = [];
  for (const test of report.tests ?? []) {
    if (test.outcome !== "failed" && test.outcome !== "error") continue;
    const lines = (test.log ?? test.call?.longrepr ?? "").split("\n");
    const errorLine = lines.find((l) => /^E\s+\S/.test(l));
    const message =
      shortException(cleanLine((errorLine ?? "").replace(/^E\s+/, ""))) ||
      test.outcome;
    let location: string | undefined;
    for (const line of lines) {
      const match = line.match(/^(\S+\.py:\d+): ([A-Za-z_][\w.]*)$/);
      if (match) location = `${match[1]}: ${shortException(match[2])}`;
    }
    failed.push({
      id: test.nodeid,
      message,
      location,
      causes: causesIn(lines, message),
    });
  }
  return failed;
}

/** Failing tests from pytest's short summary in a job log, plus the result line and the lines around the error. */
export function testsFromLog(log: string): {
  tests: FailedTest[];
  result?: string;
  excerpt: string[];
} {
  const tests: FailedTest[] = [];
  const seen = new Set<string>();
  let result: string | undefined;
  const lines = log.split("\n").map(cleanLine);
  for (const line of lines) {
    const match = line.match(/^(FAILED|ERROR) (\S.*?)(?: - (.*))?$/);
    if (match && /::|\.py\b/.test(match[2]) && !seen.has(match[2])) {
      seen.add(match[2]);
      tests.push({
        id: match[2],
        message: shortException(match[3] ?? match[1].toLowerCase()),
        causes: [],
      });
    } else if (
      /^=+ .*\b(failed|passed|errors?)\b.* in [\d.]+s.*=+$/.test(line)
    ) {
      result = line.replace(/^=+ | =+$/g, "");
    }
  }
  const errorAt = lines.findIndex((l) => l.startsWith("##[error]"));
  const end = errorAt >= 0 ? errorAt + 1 : lines.length;
  const excerpt = lines
    .slice(0, end)
    .filter(
      (l) => l && !l.startsWith("##[group]") && !l.startsWith("##[endgroup]"),
    )
    .slice(-8);
  return { tests, result, excerpt };
}

/** True when two paths share their file name and parent directory (CI paths often differ in root). */
export function samePath(a: string, b: string): boolean {
  const left = a.split("/").filter(Boolean);
  const right = b.split("/").filter(Boolean);
  if (left.join("/") === right.join("/")) return true;
  if (left.length < 2 || right.length < 2) return false;
  return left.slice(-2).join("/") === right.slice(-2).join("/");
}

function inFiles(
  path: string | undefined,
  files: string[] | undefined,
): boolean {
  return !!path && !!files && files.some((file) => samePath(path, file));
}

function signature(message: string): string {
  return message.replace(/\d+/g, "N").slice(0, 40);
}

interface Group {
  message: string;
  location?: string;
  tests: Map<string, Failure>;
  sources: Set<string>;
  causes: Map<string, number>;
}

export function groupFailures(failures: Failure[]): Group[] {
  const groups = new Map<string, Group>();
  for (const failure of failures) {
    const key = signature(failure.test.message);
    let group = groups.get(key);
    if (!group) {
      group = {
        message: failure.test.message,
        tests: new Map(),
        sources: new Set(),
        causes: new Map(),
      };
      groups.set(key, group);
    }
    group.location ??= failure.test.location;
    if (!group.tests.has(failure.test.id))
      group.tests.set(failure.test.id, failure);
    group.sources.add(failure.source);
    for (const cause of new Set(failure.test.causes)) {
      group.causes.set(cause, (group.causes.get(cause) ?? 0) + 1);
    }
  }
  return [...groups.values()].sort((a, b) => b.tests.size - a.tests.size);
}

function testPath(id: string): string {
  return id.split("::")[0];
}

export function renderDigest(
  data: DigestData,
  limits: DigestLimits = DEFAULT_LIMITS,
): string {
  const out: string[] = [];
  const base = data.baseBranch;
  out.push(
    `CI digest: ${data.repo} ${data.ref} @ ${data.headSha.slice(0, 8)}${base ? ` vs ${base}` : ""}`,
  );
  if (data.prFiles) {
    const shown = data.prFiles.slice(0, 15).join(", ");
    const more =
      data.prFiles.length > 15 ? `, +${data.prFiles.length - 15} more` : "";
    out.push(`PR files (${data.prFiles.length}): ${shown}${more}`);
  }
  const failedRuns = data.totalRuns - data.passedRuns - data.pending.length;
  out.push(
    `Runs: ${data.totalRuns} (${data.passedRuns} passed, ${failedRuns} failed, ${data.pending.length} pending)`,
  );
  if (data.pending.length) out.push(`Pending: ${data.pending.join(", ")}`);
  if (data.failedWithoutFailedJobs.length) {
    out.push(
      `Failed runs with no failed job (setup/skips): ${data.failedWithoutFailedJobs.join(", ")}`,
    );
  }

  if (data.jobs.length === 0) {
    out.push("", data.pending.length ? "No failures yet." : "No failures.");
    return out.join("\n") + "\n";
  }

  out.push(
    "",
    base && data.baseRuns > 0
      ? `Failed jobs [${base}: failed/completed in last ${data.baseRuns} push runs]:`
      : "Failed jobs:",
  );
  for (const job of data.jobs) {
    const baseNote = job.base
      ? `  [${base}: ${job.base.failed}/${job.base.total}]`
      : "";
    const steps = job.failedSteps.length
      ? `  step: ${job.failedSteps.join(", ")}`
      : "";
    const result = job.result ? `  (${job.result})` : "";
    out.push(
      `- ${job.workflow} / ${job.name}${baseNote}${steps}${result}`,
      `  ${job.url}`,
    );
  }

  const groups = groupFailures(data.failures);
  if (groups.length) {
    const total = groups.reduce((n, g) => n + g.tests.size, 0);
    out.push(
      "",
      `Failing tests: ${total} in ${groups.length} signature${groups.length === 1 ? "" : "s"}`,
    );
  }
  groups.slice(0, limits.groups).forEach((group, i) => {
    out.push(
      `#${i + 1} ${group.tests.size} test${group.tests.size === 1 ? "" : "s"}: ${group.message}`,
    );
    if (group.location) {
      const mark = inFiles(group.location.split(":")[0], data.prFiles)
        ? "  [PR file]"
        : "";
      out.push(`   at ${group.location}${mark}`);
    }
    const topCause = [...group.causes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCause) out.push(`   captured in ${topCause[1]}: ${topCause[0]}`);
    out.push(`   from: ${[...group.sources].join("; ")}`);
    const failures = [...group.tests.values()];
    if (base && data.baseRuns > 0) {
      const onBase = failures.filter((f) =>
        data.baseFailures.get(f.workflow)?.has(f.test.id),
      ).length;
      out.push(`   also failing on ${base}: ${onBase}/${failures.length}`);
    }
    failures.slice(0, limits.testsPerGroup).forEach((f) => {
      const marks = [
        inFiles(testPath(f.test.id), data.prFiles) ? "PR file" : "",
        data.baseFailures.get(f.workflow)?.has(f.test.id)
          ? `fails on ${base}`
          : "",
      ].filter(Boolean);
      out.push(
        `   - ${f.test.id}${marks.length ? `  [${marks.join(", ")}]` : ""}`,
      );
    });
    if (failures.length > limits.testsPerGroup)
      out.push(`   - +${failures.length - limits.testsPerGroup} more`);
  });
  if (groups.length > limits.groups)
    out.push(`+${groups.length - limits.groups} more signatures`);

  for (const excerpt of data.logExcerpts) {
    out.push(
      "",
      `No test failures parsed from ${excerpt.source}; log before the error:`,
    );
    out.push(...excerpt.lines.map((l) => `  | ${l}`));
  }
  return out.join("\n") + "\n";
}

const FAILED_CONCLUSIONS = new Set(["failure", "cancelled", "timed_out"]);

function readPytestReport(entry: CatalogEntry): FailedTest[] | undefined {
  const pytestJson =
    entry.detectedType === "pytest-json" ||
    (entry.detectedType === "pytest-html" && entry.converted);
  if (!pytestJson) return undefined;
  try {
    return testsFromPytestReport(
      JSON.parse(readFileSync(entry.filePath, "utf-8")),
    );
  } catch {
    return undefined;
  }
}

function jobLog(
  repo: string,
  jobId: string,
  logFiles: Map<string, string>,
  logger: Logger,
): string {
  const file = logFiles.get(jobId);
  try {
    return file ? readFileSync(file, "utf-8") : getJobLogs(repo, jobId);
  } catch (error) {
    logger.warn(
      `  Could not read log for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "";
  }
}

/** Gathers digest data for a completed gh-ci-artifacts run, querying GitHub for jobs, PR files and base runs. */
export function collectDigest(
  summary: Summary,
  catalog: CatalogEntry[],
  logger: Logger,
  options: { baseRuns?: number } = {},
): DigestData {
  const repo = summary.repo;
  const baseRunCount = options.baseRuns ?? 3;
  const pr = summary.mode === "pr" ? getPRDetails(repo, summary.pr) : undefined;
  const logFiles = new Map<string, string>();
  for (const run of summary.runs) {
    for (const log of run.logs)
      if (log.jobId && log.logFile) logFiles.set(log.jobId, log.logFile);
  }

  const data: DigestData = {
    repo,
    ref:
      summary.mode === "pr" ? `PR #${summary.pr}` : `branch ${summary.branch}`,
    headSha: summary.headSha,
    baseBranch: pr?.baseRefName,
    baseRuns: pr ? baseRunCount : 0,
    prFiles: pr?.files,
    totalRuns: summary.runs.length,
    passedRuns: summary.runs.filter((r) => r.conclusion === "success").length,
    pending: [],
    failedWithoutFailedJobs: [],
    jobs: [],
    failures: [],
    baseFailures: new Map(),
    logExcerpts: [],
  };

  const failedJobsByWorkflow = new Map<
    string,
    { path: string; names: Set<string> }
  >();
  for (const run of summary.runs) {
    const pending = run.conclusion === "in_progress";
    if (pending) data.pending.push(run.workflowName);
    if (run.conclusion === "success") continue;

    logger.info(`Digest: jobs for ${run.workflowName} (${run.runId})`);
    const failedJobs = getJobsWithSteps(repo, run.runId).filter(
      (job) => job.conclusion && FAILED_CONCLUSIONS.has(job.conclusion),
    );
    if (failedJobs.length === 0) {
      if (!pending) data.failedWithoutFailedJobs.push(run.workflowName);
      continue;
    }

    const reportTests = new Map<string, FailedTest[]>();
    for (const entry of catalog.filter((c) => c.runId === run.runId)) {
      const tests = readPytestReport(entry);
      if (tests?.length) reportTests.set(entry.artifactName, tests);
    }
    for (const [artifactName, tests] of reportTests) {
      for (const test of tests)
        data.failures.push({
          test,
          source: artifactName,
          workflow: run.workflowPath,
        });
    }

    for (const job of failedJobs) {
      const digestJob: DigestJob = {
        workflow: run.workflowName,
        name: job.name,
        conclusion: job.conclusion ?? "",
        url: job.html_url,
        failedSteps: job.steps,
      };
      data.jobs.push(digestJob);
      const entry = failedJobsByWorkflow.get(run.workflowName) ?? {
        path: run.workflowPath,
        names: new Set(),
      };
      entry.names.add(job.name);
      failedJobsByWorkflow.set(run.workflowName, entry);
      // Test reports usually cover every job of a run; fall back to the job log when there are none.
      if (reportTests.size > 0) continue;
      const parsed = testsFromLog(jobLog(repo, job.id, logFiles, logger));
      const source = `${run.workflowName} / ${job.name}`;
      digestJob.result = parsed.result;
      for (const test of parsed.tests)
        data.failures.push({ test, source, workflow: run.workflowPath });
      if (parsed.tests.length === 0)
        data.logExcerpts.push({ source, lines: parsed.excerpt });
    }
  }

  if (pr && baseRunCount > 0) {
    for (const [workflowName, { path, names }] of failedJobsByWorkflow) {
      logger.info(`Digest: ${pr.baseRefName} runs of ${workflowName}`);
      const counts = new Map<string, { failed: number; total: number }>();
      const failing = new Set<string>();
      for (const runId of getBaseBranchRuns(
        repo,
        basename(path),
        pr.baseRefName,
        baseRunCount,
      )) {
        for (const job of getJobsWithSteps(repo, runId)) {
          if (!names.has(job.name) || job.conclusion === "skipped") continue;
          const count = counts.get(job.name) ?? { failed: 0, total: 0 };
          count.total++;
          if (job.conclusion && FAILED_CONCLUSIONS.has(job.conclusion)) {
            count.failed++;
            for (const test of testsFromLog(
              jobLog(repo, job.id, new Map(), logger),
            ).tests)
              failing.add(test.id);
          }
          counts.set(job.name, count);
        }
      }
      data.baseFailures.set(path, failing);
      for (const job of data.jobs) {
        if (job.workflow === workflowName)
          job.base = counts.get(job.name) ?? { failed: 0, total: 0 };
      }
    }
  }
  return data;
}

/** Writes `digest.txt` next to summary.json and returns its text. */
export function writeDigest(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[],
  logger: Logger,
  options: { baseRuns?: number } = {},
): string {
  const text = renderDigest(collectDigest(summary, catalog, logger, options));
  writeFileSync(join(outputDir, "digest.txt"), text);
  return text;
}
