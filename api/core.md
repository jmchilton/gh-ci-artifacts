# Core Functions API

The core functions exported from `gh-ci-artifacts` provide programmatic access to configuration, validation, logging, and HTML viewer generation.

## Configuration Functions

### `loadConfig(cwd?)`

Load configuration from files in the current directory.

**Signature:**
```typescript
function loadConfig(cwd?: string): Config
```

**Parameters:**
- `cwd` (optional) - Working directory to search for config files (defaults to `process.cwd()`)

**Returns:** `Config` object, or empty object `{}` if no config file found

**Behavior:**
- Searches for config files in order: `.gh-ci-artifacts.json`, `.gh-ci-artifacts.yml`, `.gh-ci-artifacts.yaml`
- Returns first config file found
- Validates regex patterns in skip patterns and custom artifact types
- Throws error if config file is malformed

**Example:**
```typescript
import { loadConfig } from 'gh-ci-artifacts';

const config = loadConfig();
// Returns config from .gh-ci-artifacts.json (or .yml/.yaml) if found
// Returns {} if no config file exists
```

### `mergeConfig(fileConfig, cliConfig)`

Merge file configuration with CLI overrides.

**Signature:**
```typescript
function mergeConfig(fileConfig: Config, cliConfig: Partial<Config>): Config
```

**Parameters:**
- `fileConfig` - Configuration loaded from file
- `cliConfig` - Partial configuration (CLI overrides)

**Returns:** Merged `Config` object

**Behavior:**
- CLI values take precedence over file config
- Provides defaults for `maxRetries` (3), `retryDelay` (5), `pollInterval` (1800), `maxWaitTime` (21600)
- Merges arrays (skip patterns, workflows) by replacing file config with CLI config

**Example:**
```typescript
import { loadConfig, mergeConfig } from 'gh-ci-artifacts';

const fileConfig = loadConfig();
const merged = mergeConfig(fileConfig, {
  outputDir: './custom-output',
  maxRetries: 5
});
```

### `getOutputDir(config, ref, cwd?)`

Determine output directory path for a given reference.

**Signature:**
```typescript
function getOutputDir(
  config: Config,
  ref: { pr?: number; branch?: string; remote?: string },
  cwd?: string
): string
```

**Parameters:**
- `config` - Configuration object (may contain `outputDir`)
- `ref` - Reference object with either `pr` number or `branch` name (and optional `remote`)
- `cwd` (optional) - Working directory (defaults to `process.cwd()`)

**Returns:** Full path to output directory

**Behavior:**
- Uses `config.outputDir` as base directory, or `.gh-ci-artifacts` in `cwd` if not specified
- Generates subdirectory name:
  - PR mode: `pr-{number}`
  - Branch mode: `branch-{remote}-{sanitized-branch-name}`
- Sanitizes branch names (replaces `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|` with `-`)

**Example:**
```typescript
import { loadConfig, getOutputDir } from 'gh-ci-artifacts';

const config = loadConfig();
const outputDir = getOutputDir(config, { pr: 123 });
// Returns: ".gh-ci-artifacts/pr-123" (or custom base if configured)

const branchDir = getOutputDir(config, { branch: 'feature/test', remote: 'origin' });
// Returns: ".gh-ci-artifacts/branch-origin-feature-test"
```

### `findAndLoadConfigFile(explicitPath?, cwd?)`

Find and load a config file, returning path, format, and raw content.

**Signature:**
```typescript
function findAndLoadConfigFile(
  explicitPath?: string,
  cwd?: string
): { path: string; format: "json" | "yaml"; content: unknown }
```

**Parameters:**
- `explicitPath` (optional) - Explicit path to config file
- `cwd` (optional) - Working directory to search (defaults to `process.cwd()`)

**Returns:** Object with `path`, `format`, and parsed `content`

**Behavior:**
- If `explicitPath` provided, loads that file directly
- Otherwise, searches for config files in order of preference
- Throws error if file not found or cannot be parsed
- Useful for validation tools (like `gh-ci-artifacts-config-lint`)

**Example:**
```typescript
import { findAndLoadConfigFile } from 'gh-ci-artifacts';

const { path, format, content } = findAndLoadConfigFile();
// Returns: { path: ".gh-ci-artifacts.json", format: "json", content: {...} }
```

### `CONFIG_FILENAMES`

Array of config filenames searched in order.

**Type:** `readonly string[]`

**Value:**
```typescript
[".gh-ci-artifacts.json", ".gh-ci-artifacts.yml", ".gh-ci-artifacts.yaml"]
```

**Example:**
```typescript
import { CONFIG_FILENAMES } from 'gh-ci-artifacts';

console.log(CONFIG_FILENAMES);
// [".gh-ci-artifacts.json", ".gh-ci-artifacts.yml", ".gh-ci-artifacts.yaml"]
```

## Validation Functions

### `validateGhSetup()`

Validate that GitHub CLI is installed and authenticated.

**Signature:**
```typescript
function validateGhSetup(): void
```

**Behavior:**
- Checks if `gh` CLI is installed
- Checks if user is authenticated with GitHub
- Throws error if validation fails

**Example:**
```typescript
import { validateGhSetup } from 'gh-ci-artifacts';

try {
  validateGhSetup();
  console.log('GitHub CLI is ready');
} catch (error) {
  console.error('GitHub CLI setup invalid:', error.message);
}
```

## Logging

### `Logger`

Class for structured logging with debug mode support.

**Signature:**
```typescript
class Logger {
  constructor(debugMode?: boolean);
  info(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  progress(message: string): void;
}
```

**Methods:**
- `info(message)` - Log info message (always shown)
- `debug(message)` - Log debug message (only if `debugMode` is true)
- `warn(message)` - Log warning message (always shown, prefixed with `[WARN]`)
- `error(message)` - Log error message (always shown, prefixed with `[ERROR]`)
- `progress(message)` - Log progress message (always shown)

**Note:** All messages are written to `stderr` to allow stdout to be used for structured output.

**Example:**
```typescript
import { Logger } from 'gh-ci-artifacts';

const logger = new Logger(true); // Enable debug mode

logger.info('Starting download');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error message');
logger.progress('Downloading artifact 1/10');
```

## HTML Viewer Generation

### `generateHtmlViewer(outputDir, summary, catalog)`

Generate an interactive HTML viewer for downloaded artifacts.

**Signature:**
```typescript
function generateHtmlViewer(
  outputDir: string,
  summary: Summary,
  catalog: CatalogEntry[]
): void
```

**Parameters:**
- `outputDir` - Output directory where artifacts are stored
- `summary` - Summary object with run metadata and statistics
- `catalog` - Array of catalog entries for all artifacts

**Behavior:**
- Generates `index.html` in `outputDir`
- Builds file tree from `outputDir` structure
- Embeds summary, catalog, and artifacts data as JSON
- Includes inline previews for small files (< 50KB)
- Provides lazy loading for larger files (< 500KB)
- Self-contained HTML (no external dependencies)

**Example:**
```typescript
import { generateHtmlViewer } from 'gh-ci-artifacts';
import type { Summary, CatalogEntry } from 'gh-ci-artifacts';

const summary: Summary = { /* ... */ };
const catalog: CatalogEntry[] = [ /* ... */ ];

generateHtmlViewer('./output', summary, catalog);
// Generates ./output/index.html
```

## Schema Validation

### `configSchema`

Zod schema for validating configuration objects.

**Signature:**
```typescript
const configSchema: z.ZodObject<{...}>
```

**Type:** Zod schema object

**Usage:**
```typescript
import { configSchema } from 'gh-ci-artifacts';
import { z } from 'zod';

const result = configSchema.safeParse(configData);
if (result.success) {
  const validConfig = result.data;
} else {
  console.error('Invalid config:', result.error);
}
```

**Example:**
```typescript
import { configSchema } from 'gh-ci-artifacts';

const userConfig = {
  maxRetries: 5,
  outputDir: './artifacts'
};

const result = configSchema.safeParse(userConfig);
if (!result.success) {
  console.error('Validation errors:', result.error.format());
}
```

## Type Exports

All types are exported from the main package:

```typescript
import type {
  Config,
  Summary,
  CatalogEntry,
  ArtifactInventoryItem,
  // ... and all other types
} from 'gh-ci-artifacts';
```

See [Types API](types.md) for complete type documentation.

## Complete Example

```typescript
import {
  loadConfig,
  mergeConfig,
  getOutputDir,
  validateGhSetup,
  Logger,
  generateHtmlViewer,
  type Config,
  type Summary,
  type CatalogEntry
} from 'gh-ci-artifacts';

// Validate setup
validateGhSetup();

// Load and merge config
const fileConfig = loadConfig();
const config = mergeConfig(fileConfig, {
  maxRetries: 5,
  outputDir: './ci-artifacts'
});

// Get output directory
const outputDir = getOutputDir(config, { pr: 123 });

// Create logger
const logger = new Logger(true);

// Generate HTML viewer (after downloading artifacts)
const summary: Summary = { /* ... */ };
const catalog: CatalogEntry[] = [ /* ... */ ];
generateHtmlViewer(outputDir, summary, catalog);
```

## See Also

- [Types API](types.md) - Complete type definitions
- [CLI Module](cli.md) - Command-line interface
- [Configuration Guide](../guide/configuration.md) - Configuration file format
