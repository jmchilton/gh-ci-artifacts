# gh-ci-artifacts - Claude Instructions

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with semantic-release for automated versioning and releases.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature (triggers minor version bump)
- **fix**: Bug fix (triggers patch version bump)
- **perf**: Performance improvement (triggers patch version bump)
- **docs**: Documentation only (no release)
- **style**: Code style changes (no release)
- **refactor**: Code refactoring (no release)
- **test**: Adding/updating tests (no release)
- **chore**: Build/tooling changes (no release)

### Breaking Changes

Add `!` after type or `BREAKING CHANGE:` in footer for major version bump:

```
feat!: change API signature → major bump
BREAKING CHANGE: API redesign → major bump
```

### Examples

```
feat: add support for new test framework

fix: handle missing duration field in artifact reports

docs: update CLI usage documentation

chore: upgrade commander.js to 14.0.2
```

### Important Notes

- ALWAYS use conventional commit format when creating commits
- First line <= 72 chars, imperative mood
- Breaking changes require `!` or `BREAKING CHANGE:` footer
- Commits trigger automatic releases on push to main
- semantic-release manages version numbers automatically
- CHANGELOG.md auto-generated from commits

## Project Standards

- Node.js >= 20.0.0
- TypeScript with strict mode
- Full test coverage expected (75% threshold)
- Prettier for code formatting
- All PRs must pass CI (lint + tests)

## Release Process

Automated via semantic-release:

1. Push conventional commits to main
2. CI runs tests/lint
3. semantic-release analyzes commits
4. Version bumped (feat→minor, fix→patch, breaking→major)
5. CHANGELOG updated automatically
6. Published to npm automatically
7. GitHub release created

No manual `npm version` or `npm publish` needed.

## Development Guidelines

### Testing

- **Run tests:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Coverage:** `npm run test:coverage` (75% threshold)

### Building

- **Build:** `npm run build` (outputs to `dist/`)
- **Lint:** `npm run lint` (TypeScript type checking)
- **Dev mode:** `npm run dev -- <args>`

### Common Commands

```bash
# Install dependencies
npm install

# Run CLI locally
npm run dev -- owner/repo 123

# Build and test
npm run build && npm test

# Type check without building
npm run lint
```
