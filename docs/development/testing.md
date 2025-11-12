# Testing

This document describes the testing strategy and setup for `gh-ci-artifacts`.

## Test Framework

The project uses **Vitest** for unit and integration tests, and **Playwright** for end-to-end tests.

### Vitest

- **Fast** - Runs tests in parallel
- **TypeScript support** - Native TypeScript support
- **Compatible** - Jest-compatible API
- **Coverage** - Built-in coverage reporting

### Playwright

- **E2E testing** - Tests HTML viewer in real browser
- **Screenshot testing** - Visual regression testing
- **Isolated** - Each test runs in clean environment

## Running Tests

### Unit Tests

Run all unit tests:

```bash
npm test
```

Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

Run tests with coverage report:

```bash
npm run test:coverage
```

**Coverage thresholds:**
- Lines: 75%
- Functions: 75%
- Branches: 75%
- Statements: 75%

### E2E Tests

Run Playwright E2E tests:

```bash
npm run test:e2e
```

Run E2E tests with interactive UI:

```bash
npm run test:e2e:ui
```

## Test Organization

### Directory Structure

```
test/
├── config.test.ts              # Config loading tests
├── config-lint.test.ts         # Config lint CLI tests
├── ref-detection.test.ts       # PR/branch detection tests
├── retry.test.ts               # Retry logic tests
├── workflow-matcher.test.ts    # Workflow matching tests
├── fixtures/                   # Test fixtures
│   ├── artifacts/              # Sample artifact files
│   ├── html/                   # HTML test fixtures
│   ├── json/                   # JSON test fixtures
│   ├── txt/                    # Text file fixtures
│   └── xml/                    # XML test fixtures
├── e2e/                        # End-to-end tests
│   ├── fixtures/                # E2E test fixtures
│   └── html-viewer.spec.ts     # HTML viewer tests
└── utils/                      # Test utilities
```

### Test File Naming

- Unit tests: `*.test.ts`
- E2E tests: `*.spec.ts` (in `test/e2e/`)

## Test Types

### Unit Tests

Test individual functions and modules in isolation.

**Examples:**
- Config loading and merging
- Retry logic with exponential backoff
- Workflow matching and filtering
- Reference detection (PR vs branch)

**Characteristics:**
- Fast execution
- Mock external dependencies
- Test edge cases
- Use fixtures for sample data

### Integration Tests

Test multiple modules working together.

**Examples:**
- Config file loading → merging → output directory generation
- Workflow matching → artifact filtering → download orchestration

**Characteristics:**
- Test real interactions between modules
- Use test fixtures instead of real API calls
- Verify data flow through pipeline

### E2E Tests

Test the complete system in a real browser environment.

**Examples:**
- HTML viewer rendering
- File tree navigation
- JSON preview rendering
- Screenshot comparisons

**Characteristics:**
- Use real browser (Chromium)
- Test against fixture data
- Visual regression testing
- Slower execution

## Test Fixtures

### Unit Test Fixtures

Located in `test/fixtures/`:

- **`artifacts/`** - Sample artifact files
- **`html/`** - HTML report samples (Playwright, pytest)
- **`json/`** - JSON artifact samples (Jest, Playwright, pytest)
- **`txt/`** - Text file samples (ESLint, Flake8)
- **`xml/`** - XML samples (JUnit)

**Usage:**
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const fixture = readFileSync(
  join(__dirname, '../fixtures/html/playwright-html-sample.html'),
  'utf-8'
);
```

### E2E Test Fixtures

Located in `test/e2e/fixtures/`:

- **`example-pr/`** - Complete PR output directory structure
- **`example-pr-18/`** - Another PR example

**Structure:**
```
example-pr/
└── pr-17/
    ├── index.html
    ├── summary.json
    ├── catalog.json
    ├── artifacts.json
    └── raw/
        └── {runId}/
            └── {files}
```

**Usage:**
```typescript
import { join } from 'path';

const fixtureDir = join(__dirname, 'fixtures/example-pr/pr-17');
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    const result = functionUnderTest();
    expect(result).toBe(expected);
  });
});
```

### Async Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Async Feature', () => {
  it('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBe(expected);
  });
});
```

### Mocking

**Mock file system:**
```typescript
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const testDir = join(process.cwd(), 'test-tmp');

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true });
});
```

**Mock timers (for retry tests):**
```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should retry with delay', async () => {
  // Test retry logic with fake timers
  await vi.runAllTimersAsync();
});
```

### Test Utilities

Create reusable test utilities in `test/utils/`:

```typescript
// test/utils/test-helpers.ts
export function createMockConfig(overrides?: Partial<Config>): Config {
  return {
    maxRetries: 3,
    retryDelay: 5,
    ...overrides,
  };
}
```

## Coverage

### Coverage Report

Generate coverage report:

```bash
npm run test:coverage
```

**Output:**
- Console summary
- HTML report in `coverage/` directory
- JSON report for CI integration

### Coverage Thresholds

Coverage must meet these thresholds (configured in `vitest.config.ts`):

- **Lines:** 75%
- **Functions:** 75%
- **Branches:** 75%
- **Statements:** 75%

**Excluded from coverage:**
- `node_modules/`
- `dist/`
- `test/`
- `**/*.config.ts`
- `**/types.ts`

### CI Coverage

GitHub Actions runs coverage checks:

- Coverage report generated
- Thresholds enforced
- Fails if coverage drops below threshold

## E2E Testing

### Playwright Configuration

**`playwright.config.ts` highlights:**
- Test directory: `test/e2e/`
- Browser: Chromium
- Retries: 2 in CI, 0 locally
- Workers: 1 in CI, parallel locally

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { join } from 'path';

test('HTML viewer renders correctly', async ({ page }) => {
  const fixturePath = join(__dirname, 'fixtures/example-pr/pr-17/index.html');
  await page.goto(`file://${fixturePath}`);
  
  await expect(page.locator('h1')).toContainText('PR #17');
});
```

### Screenshot Testing

```typescript
test('HTML viewer screenshot', async ({ page }) => {
  await page.goto(`file://${fixturePath}`);
  await expect(page).toHaveScreenshot('html-viewer.png');
});
```

## Best Practices

### Test Organization

1. **One test file per module** - Match source file structure
2. **Group related tests** - Use `describe` blocks
3. **Clear test names** - Describe what is being tested
4. **Arrange-Act-Assert** - Structure tests clearly

### Test Data

1. **Use fixtures** - Don't hardcode test data
2. **Isolated tests** - Each test should be independent
3. **Clean up** - Remove temporary files/directories

### Assertions

1. **Specific assertions** - Test exact behavior, not implementation
2. **Error cases** - Test error handling and edge cases
3. **Boundary conditions** - Test limits and edge values

### Performance

1. **Fast tests** - Unit tests should run quickly
2. **Parallel execution** - Vitest runs tests in parallel
3. **Mock external calls** - Don't make real API calls in unit tests

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- **Push to main** - Full test suite
- **Pull requests** - Full test suite

**Test workflow steps:**
1. Install dependencies (`npm ci`)
2. Lint (`npm run lint`)
3. Build (`npm run build`)
4. Test (`npm test`)
5. Coverage (`npm run test:coverage`)

### Pre-commit Hooks

Consider adding pre-commit hooks (not currently configured):

```bash
# Run tests before commit
npm test

# Check formatting
npm run check-format
```

## Troubleshooting

### Tests Timing Out

**Issue:** Tests hang or timeout

**Solutions:**
- Check for unhandled promises
- Use `vi.useFakeTimers()` for timer-based tests
- Use `await vi.runAllTimersAsync()` for async timers

### Coverage Not Meeting Threshold

**Issue:** Coverage below 75%

**Solutions:**
- Add tests for uncovered code paths
- Review excluded files (may need to include some)
- Check that all branches are tested

### E2E Tests Failing

**Issue:** Playwright tests fail locally

**Solutions:**
- Run `npx playwright install` to install browsers
- Check fixture paths are correct
- Verify HTML viewer generates correctly

## See Also

- [Building](building.md) - Build process
- [Contributing](contributing.md) - Contribution guidelines
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
