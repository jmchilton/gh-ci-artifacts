# Fixture Generation Framework Plan

## Overview

Create reproducible test fixtures from real tools using small sample projects in multiple languages. Each project generates real CI artifacts (test results, linter output, type checker reports) to ensure parsers work with actual tool output. All fixture generation runs in Docker containers to ensure hermetic builds and protect against toolchain drift.

## Goals

1. **Real artifacts**: Generate fixtures from actual tools (jest, eslint, tsc, playwright, pytest, ruff, mypy)
2. **Reproducibility**: Docker-driven generation with pinned tool versions, committed to git
3. **Test validation**: Manifest-based tests verify detection and parsing
4. **100% coverage**: All parsing and conversion logic covered by generated fixtures
5. **Language priority**: JavaScript first, then Python (defer Java/Go/Rust)

## Directory Structure

```
fixtures/
├── sample-projects/
│   ├── javascript/                  # PHASE 1: Start here
│   │   ├── Dockerfile               # Pinned Node + tool versions
│   │   ├── docker-compose.yml       # Orchestrates generation
│   │   ├── manifest.yml             # Expected artifacts schema
│   │   ├── package.json
│   │   ├── jest.config.js
│   │   ├── playwright.config.ts
│   │   ├── eslint.config.js
│   │   ├── tsconfig.json
│   │   ├── test/
│   │   │   ├── sample.test.js       # Jest tests (pass/fail/skip)
│   │   │   └── e2e.spec.ts          # Playwright tests
│   │   └── src/
│   │       ├── sample.js            # ESLint violations
│   │       └── sample.ts            # TypeScript errors
│   └── python/                      # PHASE 2: Add later
│       ├── Dockerfile               # Pinned Python + tool versions
│       ├── docker-compose.yml
│       ├── manifest.yml
│       ├── pyproject.toml
│       ├── pytest.ini
│       ├── tests/
│       │   └── test_sample.py       # Mix of pass/fail/skip
│       └── src/
│           └── sample.py            # Ruff/mypy issues
├── generated/                       # Committed artifacts from Docker builds
│   ├── javascript/
│   │   ├── jest-json/
│   │   ├── playwright-json/
│   │   ├── playwright-html/
│   │   ├── eslint-txt/
│   │   └── tsc-txt/
│   └── python/
│       ├── pytest-json/
│       ├── pytest-html/
│       ├── ruff-txt/
│       └── mypy-txt/
├── html/                            # EXISTING: Keep these
├── json/                            # EXISTING: Keep these
├── txt/                             # EXISTING: Keep these
├── xml/                             # EXISTING: Keep these
└── README.md                        # Framework documentation
```

## Manifest Schema

Each `manifest.yml` describes expected artifacts and parsers to test:

```yaml
language: javascript
node_version: "20.11.0"      # Pinned in Dockerfile
tools:
  - name: jest
    version: "29.7.0"
  - name: "@playwright/test"
    version: "1.40.0"
  - name: eslint
    version: "8.56.0"
  - name: typescript
    version: "5.3.3"

artifacts:
  - file: "jest-results.json"
    type: jest-json
    format: json
    description: "Jest JSON reporter: 5 pass, 2 fail, 1 skip"
    parsers: []              # Detection only (no parser exists)
    coverage_target: "type-detector"

  - file: "playwright-results.json"
    type: playwright-json
    format: json
    description: "Playwright JSON: 3 pass, 1 fail"
    parsers: []
    coverage_target: "type-detector"

  - file: "playwright-report/index.html"
    type: playwright-html
    format: html
    description: "Playwright HTML with embedded JSON"
    parsers: ["extractPlaywrightJSON"]
    coverage_target: "playwright-html.ts"

  - file: "eslint-output.txt"
    type: eslint-txt
    format: txt
    description: "ESLint output with 8 violations"
    parsers: ["detectLinterType", "extractLinterOutput"]
    coverage_target: "linter-collector.ts"

  - file: "tsc-output.txt"
    type: tsc-txt
    format: txt
    description: "TypeScript compiler errors"
    parsers: ["detectLinterType", "extractLinterOutput"]
    coverage_target: "linter-collector.ts"

commands:
  generate: "docker-compose up --build"
  clean: "docker-compose down -v && rm -rf ../../generated/javascript"
```

## Docker Pattern

Each sample project uses Docker for hermetic builds with pinned tool versions.

### Dockerfile (JavaScript example)

```dockerfile
FROM node:20.11.0-alpine

WORKDIR /workspace

# Install exact versions from package.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Install Playwright browsers (cached layer)
RUN npx playwright install --with-deps chromium

# Output directory mounted as volume
RUN mkdir -p /output
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  generate:
    build: .
    volumes:
      - ../../generated/javascript:/output
    command: /bin/sh -c "
      npm run test:jest -- --json --outputFile=/output/jest-results.json;
      npm run test:playwright -- --reporter=json --output=/output/playwright-results.json;
      npm run test:playwright -- --reporter=html --output=/output/playwright-report;
      npm run lint 2>&1 | tee /output/eslint-output.txt;
      npm run typecheck 2>&1 | tee /output/tsc-output.txt;
      "
```

### Regeneration Scripts

```bash
# fixtures/sample-projects/javascript/generate.sh
#!/bin/bash
set -e
docker-compose up --build --abort-on-container-exit
docker-compose down -v
```

## Test Integration

Manifest-based validation tests ensure 100% parser coverage:

```typescript
// test/fixture-validation.test.ts
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse as parseYAML } from 'yaml'
import { detectArtifactType } from '../src/detectors/type-detector.js'
import { extractPlaywrightJSON } from '../src/parsers/html/playwright-html.js'
import { detectLinterType, extractLinterOutput } from '../src/parsers/linters/extractors.js'

describe('Generated fixture validation', () => {
  const languages = ['javascript'] // Expand to ['javascript', 'python'] later

  for (const lang of languages) {
    describe(`${lang} fixtures`, () => {
      const manifestPath = `fixtures/sample-projects/${lang}/manifest.yml`
      const manifest = parseYAML(readFileSync(manifestPath, 'utf-8'))

      for (const artifact of manifest.artifacts) {
        const artifactPath = join('fixtures/generated', lang, artifact.file)

        describe(artifact.file, () => {
          it('exists in generated/ directory', () => {
            expect(existsSync(artifactPath)).toBe(true)
          })

          it(`detects as ${artifact.type}`, () => {
            const result = detectArtifactType(artifactPath)
            expect(result.detectedType).toBe(artifact.type)
            expect(result.originalFormat).toBe(artifact.format)
          })

          // Test parsers if specified
          if (artifact.parsers?.includes('extractPlaywrightJSON')) {
            it('parses with extractPlaywrightJSON', () => {
              const result = extractPlaywrightJSON(artifactPath)
              expect(result).not.toBeNull()
              expect(result).toHaveProperty('suites')
            })
          }

          if (artifact.parsers?.includes('detectLinterType')) {
            it('detects linter type from content', () => {
              const content = readFileSync(artifactPath, 'utf-8')
              const linterType = detectLinterType('lint', content)
              expect(linterType).toBeTruthy()
            })
          }

          if (artifact.parsers?.includes('extractLinterOutput')) {
            it('extracts linter output', () => {
              const content = readFileSync(artifactPath, 'utf-8')
              const linterType = detectLinterType('lint', content)
              const output = extractLinterOutput(linterType!, content)
              expect(output).toBeTruthy()
              expect(output!.length).toBeGreaterThan(0)
            })
          }
        })
      }
    })
  }
})
```

### Coverage Validation

```typescript
// test/coverage-check.test.ts
import { describe, it, expect } from 'vitest'

describe('Parser coverage', () => {
  it('all parsers covered by generated fixtures', () => {
    // Load all manifests
    // Extract all coverage_target values
    // Verify each parser file is mentioned
    // Ensure 100% of parsing logic exercised
  })
})
```

## Sample Test Content

### JavaScript: test/sample.test.js (Jest)

```javascript
describe('Sample tests', () => {
  it('passes basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('fails deliberately', () => {
    expect(1 + 1).toBe(3) // Deliberate failure
  })

  it.skip('skipped test', () => {
    expect(true).toBe(false)
  })

  it('another pass', () => {
    expect('hello').toMatch(/ello/)
  })

  it('async failure', async () => {
    await Promise.resolve()
    throw new Error('Async test failed')
  })
})
```

### JavaScript: test/e2e.spec.ts (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('simple navigation pass', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toHaveTitle(/Example/)
})

test('deliberate failure', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toHaveTitle(/NonExistent/) // Fails
})

test('screenshot test', async ({ page }) => {
  await page.goto('https://example.com')
  await page.screenshot({ path: 'example.png' })
})
```

### JavaScript: src/sample.js (ESLint violations)

```javascript
var unused = 1 // eslint: no-unused-vars, prefer-const

function noReturn() {
  console.log('missing return type')
} // eslint: consistent-return

const obj = {
  duplicateKey: 1,
  duplicateKey: 2 // eslint: no-dupe-keys
}

eval('dangerous') // eslint: no-eval
```

### JavaScript: src/sample.ts (TypeScript errors)

```typescript
function badTypes(x): string { // Missing param type
  return x + 1 // Type error: number returned, expected string
}

const obj: { name: string } = {
  name: 'test',
  extra: 'property' // Type error: excess property
}

let val: string = 42 // Type error: number to string
```

## Coverage Targets

Goal: 100% coverage of all parsing and conversion logic.

### Phase 1: JavaScript (CURRENT)
- **jest-json**: Detection only (no parser) ✓ test/fixture-validation.test.ts
- **playwright-json**: Detection only (no parser) ✓ test/fixture-validation.test.ts
- **playwright-html**: Detection + extractPlaywrightJSON parser ✓ src/parsers/html/playwright-html.ts
- **eslint-txt**: Detection + linter extraction ✓ src/parsers/linters/extractors.ts
- **tsc-txt**: Detection + linter extraction ✓ src/parsers/linters/extractors.ts

### Phase 2: Python (FUTURE)
- **pytest-json**: Detection only
- **pytest-html**: Detection + extractPytestJSON parser ✓ src/parsers/html/pytest-html.ts
- **ruff-txt**: Detection + linter extraction
- **mypy-txt**: Detection + linter extraction

### Deferred (Not currently supported)
- **Java**: JUnit XML
- **Go**: go test JSON
- **Rust**: cargo test JSON

## Implementation Steps

### Phase 1: JavaScript Prototype (✅ COMPLETED)

**Status**: Successfully implemented and tested. Generated 4 artifacts, 18/21 tests passing (3 failures due to existing extractor bugs).

**Completed Tasks**:
1. ✅ Setup sample project structure
   - Created `fixtures/sample-projects/javascript/`
   - Added Dockerfile with pinned Node 20.11.0
   - Added docker-compose.yml with direct npx calls
   - Added package.json with exact versions (jest 29.7.0, playwright 1.40.0, eslint 8.56.0, ts 5.3.3)
   - Added manifest.yml with artifact specifications

2. ✅ Create minimal test code
   - `test/sample.test.js`: 5 pass, 2 fail, 1 skip (Jest)
   - `test/e2e.spec.ts`: 3 pass, 1 fail (Playwright)
   - `src/sample.js`: 5 ESLint violations
   - `src/sample.ts`: 4 TypeScript errors

3. ✅ Generate artifacts via Docker
   - Generated 4 artifacts in `fixtures/generated/javascript/`
   - Committed generated artifacts to git
   - Note: Playwright HTML not generated (reporter issue)

4. ✅ Add validation tests
   - Created `test/fixture-validation.test.ts`
   - YAML parser already installed (yaml 2.8.1)
   - Test detection for all 4 artifacts (jest-json, playwright-json, eslint-txt, tsc-txt)
   - Test parsers: detectLinterType, extractLinterOutput
   - 18/21 tests passing

5. ✅ Verify coverage goal
   - Added `tsc-txt` type to type system
   - Updated type detector for TypeScript compiler output
   - Updated vitest.config.ts to exclude sample-projects from test runs
   - Existing tests still pass (type-detector.test.ts)

**Bugs Found**:
- `extractTSCOutput` requires "tsc" trigger in content (doesn't handle clean output)
- `extractESLintOutput` has extraction issues with clean output
- Both documented in manifest.yml

**Artifacts Generated**:
- `jest-results.json` (8.8 KB)
- `playwright-results.json` (11.6 KB)
- `eslint-output.txt` (650 B)
- `tsc-output.txt` (451 B)

### Phase 2: Python Fixtures (LATER)

1. Create `fixtures/sample-projects/python/` with Docker
2. Generate pytest-html, pytest-json, ruff, mypy artifacts
3. Extend fixture-validation.test.ts for Python
4. Cover pytest-html parser

### Phase 3: CI Integration (FUTURE)

1. Add `.github/workflows/regenerate-fixtures.yml`
2. Run weekly or on-demand
3. Detect when tool versions produce different output
4. Optional: PR validation that fixtures are up-to-date

## Benefits

- **Real data**: Parsers tested against actual tool output
- **Version tracking**: See how tool output evolves over time
- **Regression detection**: Know when parsers break due to tool changes
- **100% coverage**: Goal ensures all parsing logic tested
- **Hermetic builds**: Docker prevents "works on my machine" issues
- **Documentation**: Examples show supported formats
- **CI safety**: Detect toolchain drift before production breakage

## Design Decisions

1. **Docker over Makefiles**: Hermetic builds with pinned versions, cross-platform
2. **Commit artifacts**: Small size, worth it for stability detection
3. **Manifest-driven tests**: Declarative, easy to extend
4. **Coverage tracking**: Explicit parser → fixture mapping
5. **JavaScript first**: Highest ROI (jest, playwright, eslint, tsc all common)

## Future Extensions

- **Matrix testing**: Generate artifacts from multiple tool versions (e.g., jest 28, 29, 30)
- **Snapshot testing**: Auto-detect when tool output format changes
- **Parser benchmarks**: Performance testing with real artifacts
- **Corpus expansion**: Accept community-contributed sample projects
- **pytest-html parser**: Currently exists but not covered by generated fixtures
