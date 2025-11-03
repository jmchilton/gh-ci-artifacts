# gh-ci-artifacts - Claude Instructions

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with semantic-release for automated versioning and releases.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types (0.x.y versioning)

- **feat**: New feature (triggers 0.minor.0 bump)
- **fix**: Bug fix (triggers 0.x.patch bump)
- **perf**: Performance improvement (triggers 0.x.patch bump)
- **docs**: Documentation only (no release)
- **style**: Code style changes (no release)
- **refactor**: Code refactoring (no release)
- **test**: Adding/updating tests (no release)
- **chore**: Build/tooling changes (no release)

### Breaking Changes (0.x versioning)

In 0.x releases, breaking changes trigger minor bump (0.minor.0):
```
feat!: redesign artifact download API → 0.2.0
BREAKING CHANGE: Download method signature changed → 0.2.0
```

Once ready for stable 1.0.0, update .releaserc.json release rules.

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

- Node.js >= 18.0.0
- TypeScript with strict mode
- Full test coverage expected (75% threshold)
- Prettier for code formatting
- All PRs must pass CI (lint + tests)

## Release Process

Automated via semantic-release (0.x versioning):
1. Push conventional commits to main
2. CI runs tests/lint
3. semantic-release analyzes commits
4. Version bumped (feat→0.minor.0, fix→0.x.patch)
5. CHANGELOG updated automatically
6. Published to npm automatically
7. GitHub release created

No manual `npm version` or `npm publish` needed.

First release was 0.1.0, subsequent features bump minor (0.2.0, 0.3.0, etc).

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
