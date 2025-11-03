import type { ValidationResult } from "./types.js";

/**
 * Validates cargo test text output format
 * Expected patterns:
 * - "running N tests"
 * - "test result: ok." or "test result: FAILED."
 * - Individual test results like "test tests::test_name ... ok"
 */
export function validateCargoTestOutput(content: string): ValidationResult {
  // Check for running tests line
  const runningPattern = /running\s+\d+\s+tests?/i.test(content);

  // Check for test result summary
  const resultPattern = /test result:\s+(ok|FAILED)\./i.test(content);

  // Check for individual test lines
  const testLinePattern = /test\s+\S+\s+\.\.\.\s+(ok|FAILED|ignored)/i.test(
    content,
  );

  if ((runningPattern && resultPattern) || testLinePattern) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match cargo test output format",
  };
}
