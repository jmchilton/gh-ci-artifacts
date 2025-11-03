# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-11-03

### Added

- Initial release of gh-ci-artifacts
- Download GitHub Actions CI artifacts from pull requests
- Extract job logs for runs without artifacts
- Automatic test framework detection (Playwright, Jest, pytest, JUnit)
- HTML to JSON conversion for test reports (Playwright, pytest-html)
- Linter output extraction from logs (ESLint, Prettier, Ruff, flake8, mypy, etc.)
- Resume functionality for incomplete downloads
- Dry-run mode to preview downloads
- Configuration file support (.gh-ci-artifacts.json)
- Interactive HTML viewer for browsing artifacts
- Comprehensive summary generation (summary.json, catalog.json, artifacts.json)
- Artifact skip patterns and expectations validation
- Exit codes for automation integration (0=complete, 1=partial, 2=incomplete)
- Retry logic with exponential backoff
- GitHub CLI integration for authentication

### Features

- Zero-config operation with optional configuration
- Focuses on failures by default (configurable)
- Serial downloads to respect GitHub rate limits
- Graceful handling of expired artifacts
- Support for Node.js 18+

[0.1.0]: https://github.com/jmchilton/gh-ci-artifacts/releases/tag/v0.1.0
