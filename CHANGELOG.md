## [1.4.1](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.4.0...v1.4.1) (2025-11-03)

### Bug Fixes

- use absolute paths for Copy Path buttons ([929ac64](https://github.com/jmchilton/gh-ci-artifacts/commit/929ac641f0d1259d927515d3d582ff279a363b20))

# [1.4.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.3.1...v1.4.0) (2025-11-03)

### Features

- add tabbed interface to HTML viewer ([ce5d0d9](https://github.com/jmchilton/gh-ci-artifacts/commit/ce5d0d9f2c55dea7244962326f86588b7cbd876e))

## [1.3.1](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.3.0...v1.3.1) (2025-11-03)

### Bug Fixes

- normalize catalog file paths to be relative ([c705ea8](https://github.com/jmchilton/gh-ci-artifacts/commit/c705ea8ca3fc4e8a446e132c4e4cbbff9ac92c57))

# [1.3.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.2.1...v1.3.0) (2025-11-03)

### Features

- add Open and Copy Path buttons to catalog table ([0a19b1d](https://github.com/jmchilton/gh-ci-artifacts/commit/0a19b1d11074fe954ec80cfd470be87732011cac))

## [1.2.1](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.2.0...v1.2.1) (2025-11-03)

### Bug Fixes

- remove Open button from artifacts table (directories only) ([88564a6](https://github.com/jmchilton/gh-ci-artifacts/commit/88564a63630c8584151d556c8baa6b7bfb0cb2d3))

# [1.2.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.1.1...v1.2.0) (2025-11-03)

### Features

- add Open and Copy Path buttons to All Artifacts table ([ee3bae2](https://github.com/jmchilton/gh-ci-artifacts/commit/ee3bae2370e538200b3944bb3511940260b316db))

## [1.1.1](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.1.0...v1.1.1) (2025-11-03)

### Bug Fixes

- resolve undefined data reference in GitHub Actions links ([c94d5c5](https://github.com/jmchilton/gh-ci-artifacts/commit/c94d5c5fd90176922c484370d19a0a5e9ee4a806))

# [1.1.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.0.0...v1.1.0) (2025-11-03)

### Features

- add GitHub Actions links to HTML summary output ([7dec501](https://github.com/jmchilton/gh-ci-artifacts/commit/7dec50184feaa47bc8a08eca3fdda9adfad84ab9))

# 1.0.0 (2025-11-03)

### Features

- prepare initial npm package publication ([9f0c44b](https://github.com/jmchilton/gh-ci-artifacts/commit/9f0c44b2cf98b5773f5298fd26642e5d48372b14))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-03

### Added

- Download GitHub Actions CI artifacts from pull requests
- Extract job logs for runs without artifacts
- Automatic test framework detection (Playwright, Jest, pytest, JUnit)
- HTML to JSON conversion for test reports (Playwright, pytest-html)
- Linter output extraction from logs (ESLint, Prettier, Ruff, flake8, mypy)
- Resume functionality for incomplete downloads
- Dry-run mode to preview downloads
- Configuration file support (.gh-ci-artifacts.json) with skip patterns and expectations
- Interactive HTML viewer for browsing artifacts
- Comprehensive summary generation (summary.json, catalog.json, artifacts.json)
- Exit codes for automation (0=complete, 1=partial, 2=incomplete)
- Retry logic with exponential backoff
- GitHub CLI integration with automatic authentication
- Zero-config operation with optional configuration
- Serial downloads to respect GitHub rate limits
- Graceful handling of expired artifacts

[1.0.0]: https://github.com/jmchilton/gh-ci-artifacts/releases/tag/v1.0.0
