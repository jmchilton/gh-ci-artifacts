import type { ValidationResult } from "./types.js";

/**
 * Validates clippy JSON output format
 * Expected format: newline-delimited JSON with objects containing:
 * - "reason" field ("compiler-message", "compiler-artifact", "build-finished")
 * - "message" field for compiler-message entries with "level" and "spans"
 */
export function validateClippyJSON(content: string): ValidationResult {
  try {
    const lines = content.trim().split("\n");
    let foundValidJson = false;

    // Each line should be valid JSON (skip non-JSON lines like cargo output)
    for (const line of lines) {
      if (line.trim() === "") continue;

      // Skip lines that don't look like JSON (e.g., cargo status messages)
      if (!line.trim().startsWith("{")) continue;

      try {
        const obj = JSON.parse(line);

        // Must have a reason field
        if (!obj.reason) {
          continue; // Not clippy JSON, skip
        }

        // Valid reason values
        const validReasons = [
          "compiler-message",
          "compiler-artifact",
          "build-finished",
        ];
        if (!validReasons.includes(obj.reason)) {
          return {
            valid: false,
            error: `Invalid reason value: ${obj.reason}`,
          };
        }

        // If it's a compiler message, verify structure
        if (obj.reason === "compiler-message") {
          if (!obj.message || !obj.message.level || !obj.message.spans) {
            return {
              valid: false,
              error: "Compiler message missing required fields",
            };
          }
        }

        foundValidJson = true;
      } catch {
        // Line isn't valid JSON, skip it
        continue;
      }
    }

    if (!foundValidJson) {
      return {
        valid: false,
        error: "No valid clippy JSON messages found",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates clippy text output format
 * Expected patterns:
 * - "warning:" or "error:" lines with file paths
 * - Code span indicators like "--> src/lib.rs:7:5"
 * - Warning/error count summary
 */
export function validateClippyText(content: string): ValidationResult {
  // Check for clippy-specific patterns
  const warningPattern = /(warning|error):/i.test(content);
  const spanPattern = /-->\s+\S+\.rs:\d+:\d+/.test(content);
  const summaryPattern = /\d+\s+warnings?\s+emitted/i.test(content);

  if ((warningPattern && spanPattern) || summaryPattern) {
    return { valid: true };
  }

  // Empty output is valid (no warnings/errors)
  if (content.trim() === "") {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match clippy text output format",
  };
}
