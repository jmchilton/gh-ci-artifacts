# 1.0.0 (2025-11-03)


### Features

* prepare initial npm package publication ([9f0c44b](https://github.com/jmchilton/gh-ci-artifacts/commit/9f0c44b2cf98b5773f5298fd26642e5d48372b14))

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
