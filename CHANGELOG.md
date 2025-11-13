# [1.20.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.19.0...v1.20.0) (2025-11-13)


### Features

* add local log links to HTML report summary ([52b824d](https://github.com/jmchilton/gh-ci-artifacts/commit/52b824d404656c799422b17386ef20a38a58a0e4))

# [1.19.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.18.0...v1.19.0) (2025-11-13)


### Features

* enhance logs table with job status and clearer column names ([ec55571](https://github.com/jmchilton/gh-ci-artifacts/commit/ec55571aec793c9c70c12d20709989b29bcaed40))

# [1.18.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.17.1...v1.18.0) (2025-11-12)


### Features

* add skip reason tooltip to HTML report logs ([b5e86d9](https://github.com/jmchilton/gh-ci-artifacts/commit/b5e86d97ba8318fb20a3b7d7d78dab39f544aa54))

## [1.17.1](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.17.0...v1.17.1) (2025-11-12)


### Bug Fixes

* skip log extraction for jobs that never ran ([33550ef](https://github.com/jmchilton/gh-ci-artifacts/commit/33550ef98537632bff0e563183dc1992ebc5a7e0))

# [1.17.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.16.0...v1.17.0) (2025-11-12)


### Bug Fixes

* conditionally pass --repo to gh run download when explicitly provided ([a26c9ad](https://github.com/jmchilton/gh-ci-artifacts/commit/a26c9add35b1759ec5ea9ad37a3dd8c54176f064))
* read version from package.json instead of hardcoding ([7d0de2d](https://github.com/jmchilton/gh-ci-artifacts/commit/7d0de2d709c4b0d0fe106ed791a33762c234a386))


### Features

* **api:** export downloadArtifacts for programmatic API use ([a399d35](https://github.com/jmchilton/gh-ci-artifacts/commit/a399d35b52589850e0adc35ce409b68e0d0e6b92))

# [1.16.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.15.0...v1.16.0) (2025-11-12)


### Features

* add --config CLI option for custom config paths ([7ca934e](https://github.com/jmchilton/gh-ci-artifacts/commit/7ca934ed9dfea861520970053adb82116b3185f6))

# [1.15.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.14.0...v1.15.0) (2025-11-11)


### Features

* export configSchema for programmatic validation ([721c285](https://github.com/jmchilton/gh-ci-artifacts/commit/721c2854c4c2d9c0263d81f41f3bede90c0f7dc7))

# [1.14.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.13.0...v1.14.0) (2025-11-09)


### Bug Fixes

* exclude e2e tests from vitest configuration ([f454106](https://github.com/jmchilton/gh-ci-artifacts/commit/f4541068dac53def15fad68a8dfccfe0a9eb2a31))
* update typedoc configuration for v0.28.x compatibility ([2e9263e](https://github.com/jmchilton/gh-ci-artifacts/commit/2e9263e5b7ebf6413fe3c7ce6cf9f694a00c32de))


### Features

* add Playwright E2E testing infrastructure for HTML viewer ([d3ea72b](https://github.com/jmchilton/gh-ci-artifacts/commit/d3ea72bc946ac00072ecbb79b858eead5db7a713))

# [1.13.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.12.0...v1.13.0) (2025-11-07)


### Features

* add GitHub links and PR branch tracking with strong types ([759e530](https://github.com/jmchilton/gh-ci-artifacts/commit/759e530a99eb7132cdbcba46a03fd13fdc4d5c31))

# [1.12.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.11.0...v1.12.0) (2025-11-07)


### Features

* add branch mode support with smart argument detection ([939328f](https://github.com/jmchilton/gh-ci-artifacts/commit/939328fef26542e0bb94293c94d8be418464da28))

# [1.11.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.10.0...v1.11.0) (2025-11-07)


### Features

* add custom artifact type mappings and improve unknown type handling ([fb3efec](https://github.com/jmchilton/gh-ci-artifacts/commit/fb3efec75ee6a645faa8a0c17ee7f139c96e2ded))

# [1.10.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.9.0...v1.10.0) (2025-11-07)


### Features

* add rich tooltips to catalog table columns ([fbe2cbb](https://github.com/jmchilton/gh-ci-artifacts/commit/fbe2cbb3407b4286ac56271773c157b85a65a253))

# [1.9.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.8.0...v1.9.0) (2025-11-07)


### Features

* add artifact type reference tooltip on catalog table hover ([cb4a987](https://github.com/jmchilton/gh-ci-artifacts/commit/cb4a98795dc0968692c8146c0472788dbfc4a623))

# [1.8.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.7.0...v1.8.0) (2025-11-07)


### Features

* add validation info to catalog rich display ([d9b5d51](https://github.com/jmchilton/gh-ci-artifacts/commit/d9b5d51a56e88892b6565a0a63dd0f3b99f7a7be))

# [1.7.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.6.0...v1.7.0) (2025-11-07)


### Features

* incorporate artifact-detective validation and metadata ([1160f82](https://github.com/jmchilton/gh-ci-artifacts/commit/1160f8216bc77bec0ab3159be92189c3190c7ca2))

# [1.6.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.5.0...v1.6.0) (2025-11-07)


### Features

* upgrade to artifact-detective v1.11.0 with unified extract() API ([6252cf0](https://github.com/jmchilton/gh-ci-artifacts/commit/6252cf0fd7de50a5e550114f390c467fea77b2b2))
* upgrade to artifact-detective v1.12.1 with fileExtension support ([dc97fbe](https://github.com/jmchilton/gh-ci-artifacts/commit/dc97fbe703fde3ef298cc7a57d630de36f491a7b))

# [1.5.0](https://github.com/jmchilton/gh-ci-artifacts/compare/v1.4.1...v1.5.0) (2025-11-04)


### Features

* update to the latest artifact-detective release. ([f34029e](https://github.com/jmchilton/gh-ci-artifacts/commit/f34029ef45729b3e96f3131e78321ecdfe0d2488))

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
