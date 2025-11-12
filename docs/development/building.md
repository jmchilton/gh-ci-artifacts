# Building

This document describes how to build `gh-ci-artifacts` from source.

## Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/jmchilton/gh-ci-artifacts.git
cd gh-ci-artifacts
npm install
```

## Build Process

### Compile TypeScript

Build the project from TypeScript source to JavaScript:

```bash
npm run build
```

**What it does:**
- Compiles TypeScript files from `src/` to JavaScript in `dist/`
- Generates type declaration files (`.d.ts`) in `dist/`
- Generates source maps (`.map`) for debugging
- Output directory: `dist/`

**TypeScript Configuration:**
- Target: ES2022
- Module: ESNext (ES modules)
- Strict mode: Enabled
- Declaration files: Generated
- Source maps: Generated

### Build Output

After building, the `dist/` directory contains:

```
dist/
├── index.js              # Main entry point
├── index.d.ts            # TypeScript declarations
├── cli.js                # CLI entry point
├── cli.d.ts
├── config.js
├── config.d.ts
├── ...                   # Other compiled modules
```

## Development Mode

### Run Without Building

Use `tsx` to run TypeScript directly without building:

```bash
# Run main CLI
npm run dev -- 123 --repo owner/repo

# Run config lint CLI
npm run dev:config-lint -- --config .gh-ci-artifacts.json
```

**Benefits:**
- Faster iteration (no build step)
- Immediate feedback
- Useful for testing changes

### Type Checking

Check types without building:

```bash
npm run lint
```

**What it does:**
- Runs `tsc --noEmit` to check types
- No output files generated
- Fast feedback on type errors

## Code Formatting

### Format Code

Format all code files:

```bash
npm run format
```

**What it does:**
- Runs Prettier on all files
- Formats TypeScript, JSON, YAML, Markdown
- Uses project's Prettier configuration

### Check Formatting

Check if code is formatted (without modifying):

```bash
npm run check-format
```

**Use case:** CI/CD pipelines to ensure code is formatted

## Build Scripts

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `tsc` | Compile TypeScript to JavaScript |
| `dev` | `tsx src/cli.ts` | Run CLI in development mode |
| `dev:config-lint` | `tsx src/config-lint.ts` | Run config lint in development mode |
| `lint` | `tsc --noEmit` | Type check without building |
| `format` | `prettier --write .` | Format all code files |
| `check-format` | `prettier --check .` | Check formatting without modifying |

### Pre-publish Hook

Before publishing to npm, the `prepublishOnly` hook runs:

```bash
npm run build && npm test
```

**What it does:**
- Builds the project
- Runs all tests
- Prevents publishing if build or tests fail

## TypeScript Configuration

The project uses strict TypeScript settings:

**`tsconfig.json` highlights:**
- `strict: true` - Enables all strict type checking
- `target: "ES2022"` - Modern JavaScript features
- `module: "ESNext"` - ES modules
- `declaration: true` - Generates `.d.ts` files
- `sourceMap: true` - Generates source maps

**Module Resolution:**
- Uses Node.js module resolution
- Requires `.js` extensions in imports (ES modules)
- Example: `import { x } from "./file.js"`

## Output Files

### Published Files

The `package.json` `files` field specifies what gets published:

```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```

Only the `dist/` directory, README, and LICENSE are included in the npm package.

### Binary Entry Points

The `bin` field defines CLI commands:

```json
"bin": {
  "gh-ci-artifacts": "./dist/cli.js",
  "gh-ci-artifacts-config-lint": "./dist/config-lint.js"
}
```

These files must be executable and have a shebang (`#!/usr/bin/env node`).

## Clean Build

To start fresh:

```bash
# Remove build output
rm -rf dist

# Rebuild
npm run build
```

## Troubleshooting

### Build Errors

**"Cannot find module" errors:**
- Ensure all dependencies are installed: `npm install`
- Check that import paths use `.js` extensions

**Type errors:**
- Run `npm run lint` to see detailed type errors
- Check `tsconfig.json` settings

**Declaration file errors:**
- Ensure `declaration: true` in `tsconfig.json`
- Check that all exports have proper types

### Common Issues

**Build succeeds but runtime errors:**
- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Verify that `dist/` files are correct

**Module resolution errors:**
- Ensure imports use `.js` extensions
- Check that `type: "module"` is set in `package.json`

## CI/CD Integration

### GitHub Actions

The project uses GitHub Actions for CI:

**Test workflow** (`.github/workflows/test.yml`):
1. Checks out code
2. Installs dependencies (`npm ci`)
3. Lints (`npm run lint`)
4. Builds (`npm run build`)
5. Tests (`npm test`)
6. Coverage (`npm run test:coverage`)

**Release workflow** (`.github/workflows/release.yml`):
1. Builds and tests
2. Runs semantic-release for versioning and publishing

### Local CI Simulation

Run the same checks locally:

```bash
# Install dependencies
npm ci

# Lint
npm run lint

# Build
npm run build

# Test
npm test

# Coverage
npm run test:coverage
```

## Documentation Build

### Generate API Documentation

Generate TypeDoc API documentation:

```bash
npm run docs:api
```

**Output:** `docs/api/typedoc/` directory with HTML documentation

### Serve Documentation Locally

Serve documentation with Docsify:

```bash
npm run docs:dev
```

**Access:** http://localhost:3000

## Release Process

Releases are automated via semantic-release:

1. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/)
2. **semantic-release** analyzes commits and determines version bump
3. **Version** is bumped automatically (feat → minor, fix → patch, breaking → major)
4. **CHANGELOG** is updated automatically
5. **npm package** is published automatically
6. **GitHub release** is created automatically

**No manual versioning or publishing needed.**

## See Also

- [Testing](testing.md) - Testing strategy and setup
- [Contributing](contributing.md) - Contribution guidelines
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
