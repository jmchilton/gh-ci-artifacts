# artifact-detective

[![CI](https://github.com/jmchilton/artifact-detective/workflows/Test/badge.svg)](https://github.com/jmchilton/artifact-detective/actions)
[![npm version](https://badge.fury.io/js/artifact-detective.svg)](https://www.npmjs.com/package/artifact-detective)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/artifact-detective.svg)](https://nodejs.org)

📚 **[View Full Documentation](https://jmchilton.github.io/artifact-detective/)** | Detect and parse CI artifact types for test frameworks and linters.

## Overview

`artifact-detective` is a library for identifying and parsing CI artifacts from various test frameworks, linters, and type checkers. It reads HTML, JSON, XML, and text outputs, detects the tool that generated them, and extracts structured data for analysis.

## Features

- **Type validation** by content inspection
- **Automatic type detection** by content inspection
- **Many-to-JSON conversion** many artifact types can be converted to JSON for programmatic access
- **Linter output extraction** from CI logs
- **TypeScript** with full type definitions
- **Fixture Generation Framework** we generate extensive test cases from real projects using various tooling in various languages

## Installation

```bash
npm install artifact-detective
```

## Usage

### Detect Artifact Type

```typescript
import { detectArtifactType } from 'artifact-detective';

const result = detectArtifactType('./test-results/report.html');
console.log(result);
// {
//   detectedType: 'pytest-html',
//   originalFormat: 'html',
//   isBinary: false
// }
```

### Validate Artifact Content

```typescript
import { validate } from 'artifact-detective';

const content = readFileSync('./report.json', 'utf-8');
const result = validate('pytest-json', content);

if (result.valid) {
  console.log('Valid pytest JSON report');
  console.log(result.description); // Includes parsing guide
}
```

### Extract from CI Logs

```typescript
import { extract } from 'artifact-detective';

const logContent = readFileSync('./ci-log.txt', 'utf-8');

// Extract linter output from logs
const result = extract('eslint-txt', logContent);
if (result) {
  console.log('Extracted content:', result.content);
  console.log('Artifact type:', result.artifact.artifactType);
  console.log('Format info:', {
    isJSON: result.artifact.isJSON,
    toolUrl: result.artifact.toolUrl,
    parsingGuide: result.artifact.parsingGuide
  });
}
```

#### Custom Extraction Markers

For custom CI environments, you can provide markers to control extraction:

```typescript
import { extract, type ExtractorConfig } from 'artifact-detective';

const logContent = readFileSync('./ci-log.txt', 'utf-8');

// Custom extraction with start/end markers
const config: ExtractorConfig = {
  startMarker: /^Running ESLint/,
  endMarker: /^\d+ problems?/,
  includeEndMarker: true, // Include end marker line in output (default: true)
};

const result = extract('eslint-txt', logContent, { config });
if (result) {
  console.log('Extracted:', result.content);
}
```

### Convert to JSON or Normalize

Many artifact types can be normalized to JSON for programmatic access. Use the unified `extract()` function with the `normalize` option:

```typescript
import { extract } from 'artifact-detective';

const logContent = readFileSync('./ci-log.txt', 'utf-8');

// Extract and normalize to JSON in one step
const result = extract('mypy-txt', logContent, { normalize: true });
if (result) {
  const errors = JSON.parse(result.content);
  console.log(`Extracted ${errors.length} type errors`);
  console.log('Normalized type:', result.artifact.artifactType); // 'mypy-json'
  console.log('Original type was:', result.artifact.normalizedFrom); // 'mypy-txt'
}
```

#### File-based Normalization

For file-based normalization (without extraction from logs):

```typescript
import { detectArtifactType, convertToJSON, canConvertToJSON } from 'artifact-detective';

// Detect artifact type
const result = detectArtifactType('./pytest-report.html');

// Check if conversion supported
if (canConvertToJSON(result)) {
  const conversion = convertToJSON(result, './pytest-report.html');
  if (conversion) {
    const data = JSON.parse(conversion.json);
    console.log(`Found ${data.tests.length} tests`);
    console.log('Parsing guide:', conversion.description.parsingGuide);
  }
}
```

## CLI Usage

`artifact-detective` provides a command-line interface for quick detection, validation, extraction, and normalization of artifacts.

Install globally or use `npm link` for development:

```bash
npm install -g artifact-detective
artifact-detective --help
```

### Commands

#### detect

Detect artifact type from file:

```bash
# Detect type and show summary
artifact-detective detect ./report.html

# Output as JSON
artifact-detective detect --json ./report.html

# Read from stdin
cat report.html | artifact-detective detect -
```

#### validate

Validate artifact against expected type:

```bash
# Validate type
artifact-detective validate eslint-json ./eslint-results.json

# Include parsing documentation
artifact-detective validate --show-description eslint-json ./eslint-results.json

# Output as JSON
artifact-detective validate --json pytest-json ./pytest-results.json

# Via stdin
cat results.json | artifact-detective validate eslint-json -
```

Exit code: 0 for valid, 2 for invalid

#### extract

Extract artifact from CI logs with optional custom markers:

```bash
# Extract eslint output from log
artifact-detective extract eslint-txt ./ci-log.txt

# Write to file
artifact-detective extract eslint-txt ./ci-log.txt --output extracted.txt

# Custom markers for specific CI format
artifact-detective extract eslint-txt ./ci-log.txt \
  --start-marker "^Running ESLint" \
  --end-marker "^\d+ problems?"

# Via stdin
cat ci-log.txt | artifact-detective extract eslint-txt -
```

#### normalize

Convert artifact to JSON format:

```bash
# Auto-detect type and convert to JSON
artifact-detective normalize ./pytest-report.html

# Explicitly specify type
artifact-detective normalize ./report.html --type pytest-html

# Write to file
artifact-detective normalize ./report.html --output report.json

# Include parsing guide
artifact-detective normalize --show-description ./pytest-report.html

# Via stdin (auto-detect from content)
cat report.html | artifact-detective normalize -
```

## Supported Formats

| Type                  | Description                                                        | Extract | JSON        | Example Fixture                                               |
| --------------------- | ------------------------------------------------------------------ | ------- | ----------- | ------------------------------------------------------------- |
| jest-json             | Jest JSON reporter: 5 pass, 2 fail, 1 skip                         | —       | already is  | `fixtures/generated/javascript/jest-results.json`             |
| playwright-json       | Playwright JSON: 3 pass, 1 fail                                    | —       | already is  | `fixtures/generated/javascript/playwright-results.json`       |
| pytest-json           | Pytest JSON: 5 pass, 2 fail, 1 skip                                | —       | already is  | `fixtures/generated/python/pytest-results.json`               |
| mypy-ndjson           | Mypy NDJSON: type checking errors in newline-delimited JSON format | —       | can convert | `fixtures/generated/python/mypy-results.json`                 |
| eslint-json           | ESLint JSON: reports linting violations                            | —       | already is  | `fixtures/generated/javascript/eslint-results.json`           |
| clippy-ndjson         | Clippy NDJSON output with 5+ warnings                              | —       | can convert | `fixtures/generated/rust/clippy-output.json`                  |
| go-test-ndjson        | Go test NDJSON: 7 pass, 1 skip                                     | —       | can convert | `fixtures/generated/go/go-test.json`                          |
| golangci-lint-json    | golangci-lint JSON: linting violations                             | —       | already is  | `fixtures/generated/go/golangci-lint.json`                    |
| checkstyle-sarif-json | Checkstyle SARIF violations                                        | —       | already is  | `fixtures/generated/java/checkstyle-result.sarif`             |
| pytest-html           | Pytest HTML report with test details                               | —       | can convert | `fixtures/generated/python/pytest-report.html`                |
| jest-html             | Jest HTML report with test details                                 | —       | can convert | `fixtures/generated/javascript/jest-report.html`              |
| surefire-html         | Maven Surefire HTML test report                                    | —       | todo        | `fixtures/generated/java/surefire-report.html`                |
| junit-xml             | JUnit test results: 6 passed, 1 failed, 1 skipped                  | —       | todo        | `fixtures/generated/java/TEST-com.example.CalculatorTest.xml` |
| checkstyle-xml        | Checkstyle violations                                              | —       | todo        | `fixtures/generated/java/checkstyle-result.xml`               |
| spotbugs-xml          | SpotBugs analysis                                                  | —       | todo        | `fixtures/generated/java/spotbugsXml.xml`                     |
| eslint-txt            | ESLint output with violations                                      | ✓       | todo        | `fixtures/generated/javascript/eslint-output.txt`             |
| tsc-txt               | TypeScript compiler errors                                         | ✓       | todo        | `fixtures/generated/javascript/tsc-output.txt`                |
| mypy-txt              | Mypy type checker errors                                           | ✓       | todo        | `fixtures/generated/python/mypy-output.txt`                   |
| ruff-txt              | Ruff linter output with violations                                 | ✓       | todo        | `fixtures/generated/python/ruff-output.txt`                   |
| clippy-txt            | Clippy text output with warnings                                   | ✓       | todo        | `fixtures/generated/rust/clippy-output.txt`                   |
| flake8-txt            | flake8 linter output                                               | ✓       | todo        | —                                                             |
| cargo-test-txt        | Cargo test text output: 4 pass, 1 panic, 1 ignored                 | —       | todo        | `fixtures/generated/rust/cargo-test-output.txt`               |
| rustfmt-txt           | Rustfmt check output                                               | —       | todo        | `fixtures/generated/rust/rustfmt-output.txt`                  |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Test with coverage report
npm run test:coverage

# Format code
npm run format

# Type check
npm run lint
```

## License

MIT
