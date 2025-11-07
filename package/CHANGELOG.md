# [1.12.0](https://github.com/jmchilton/artifact-detective/compare/v1.11.0...v1.12.0) (2025-11-07)


### Features

* add explicit fileExtension field to artifact types ([feefcad](https://github.com/jmchilton/artifact-detective/commit/feefcadbc145c440464a1c45879284930a1d6007))

# [1.11.0](https://github.com/jmchilton/artifact-detective/compare/v1.10.4...v1.11.0) (2025-11-07)


### Bug Fixes

* add missing type imports for ArtifactDescriptor and ExtractResult ([e1a2a23](https://github.com/jmchilton/artifact-detective/commit/e1a2a236b25d434caba201c9f36198cf5a1f7f51))


### Features

* unify extraction API with optional normalization ([d481b3f](https://github.com/jmchilton/artifact-detective/commit/d481b3f46c667fc11fdc8003561870c23a84b1ad))

## [1.10.4](https://github.com/jmchilton/artifact-detective/compare/v1.10.3...v1.10.4) (2025-11-06)


### Bug Fixes

* use relative links in artifact types table for proper docsify routing ([b40dc20](https://github.com/jmchilton/artifact-detective/commit/b40dc200bc2fae72e05aaec62b808f554063e78d))

## [1.10.3](https://github.com/jmchilton/artifact-detective/compare/v1.10.2...v1.10.3) (2025-11-06)


### Bug Fixes

* workflow should commit all generated docs and run on every push to main ([014e8dc](https://github.com/jmchilton/artifact-detective/commit/014e8dcb502fa7f968d33b567c56193446b8e702))

## [1.10.2](https://github.com/jmchilton/artifact-detective/compare/v1.10.1...v1.10.2) (2025-11-06)


### Bug Fixes

* use full paths in artifact type links for docsify routing ([5376e20](https://github.com/jmchilton/artifact-detective/commit/5376e206d9db6af6bb1bcdfd0bcc20729b651b4b))

## [1.10.1](https://github.com/jmchilton/artifact-detective/compare/v1.10.0...v1.10.1) (2025-11-06)


### Bug Fixes

* correct artifact type links to point to category pages ([1b72ac3](https://github.com/jmchilton/artifact-detective/commit/1b72ac3e54cece7a323722d1cbe131a779ee3bd6))
* use docs:build instead of docs:generate to include api docs in deployment ([8b8a436](https://github.com/jmchilton/artifact-detective/commit/8b8a436291aa282972c38e411e68d831f896d0b5))

# [1.10.0](https://github.com/jmchilton/artifact-detective/compare/v1.9.1...v1.10.0) (2025-11-06)


### Bug Fixes

* remove broken link from artifact types page ([fc17a81](https://github.com/jmchilton/artifact-detective/commit/fc17a811bc30477a128c6e6539c9aa6227904b2f))


### Features

* add typedoc configuration and complete doc scripts ([2bcd6e7](https://github.com/jmchilton/artifact-detective/commit/2bcd6e7cf51c4de6e2396554acc575400bf86067))
* implement individual artifact category pages ([b559723](https://github.com/jmchilton/artifact-detective/commit/b55972330368520d8815100c8d6183c61ddbb440))

## [1.9.1](https://github.com/jmchilton/artifact-detective/compare/v1.9.0...v1.9.1) (2025-11-06)


### Bug Fixes

* repair artifact types table rendering in docsify ([7aa6623](https://github.com/jmchilton/artifact-detective/commit/7aa662325e4fa7d70676a9cde0d0a229bee517e6))

# [1.9.0](https://github.com/jmchilton/artifact-detective/compare/v1.8.0...v1.9.0) (2025-11-05)


### Bug Fixes

* grant write permissions for gh-pages deployment in docs workflow ([fd64c68](https://github.com/jmchilton/artifact-detective/commit/fd64c68e081910297baf4a2f02853a3d701e161f)), closes [#pages](https://github.com/jmchilton/artifact-detective/issues/pages) [#pages](https://github.com/jmchilton/artifact-detective/issues/pages) [peaceiris/actions-#pages](https://github.com/peaceiris/actions-/issues/pages)


### Features

* claude command for setting up extraction feature ([a2c3b1e](https://github.com/jmchilton/artifact-detective/commit/a2c3b1ed799d949d296337fccc00d43330cbe5cd))

# [1.8.0](https://github.com/jmchilton/artifact-detective/compare/v1.7.0...v1.8.0) (2025-11-05)


### Bug Fixes

* clean timestamps and CI markers from ESLint extraction ([becdc01](https://github.com/jmchilton/artifact-detective/commit/becdc01193188876d1db4d2cb292a3512e6f8a4e))
* fixup release workflow for CLI test complexity. ([3ff19b8](https://github.com/jmchilton/artifact-detective/commit/3ff19b8d83d6b29abd23fccf7b6f753a74bb262f))
* **lint:** resolve TypeScript and ESLint errors ([581ecb5](https://github.com/jmchilton/artifact-detective/commit/581ecb5780dfbd32f91493bb7116da5b56f80f19))
* resolve pre-existing TypeScript linting errors ([d658fc9](https://github.com/jmchilton/artifact-detective/commit/d658fc9625548b611f5693263ef277cfc7326c6d))
* resolve TypeScript linting errors in test helper and normalize command ([d4bb29b](https://github.com/jmchilton/artifact-detective/commit/d4bb29b2d312166036f4038dd153f44f114aa0d3))
* **test:** remove flaky validate stdin mock test ([4e11cea](https://github.com/jmchilton/artifact-detective/commit/4e11cea1f4b8d8e700d06c8e5f9f5daffa026449))


### Features

* add comprehensive artifact type documentation system ([658a346](https://github.com/jmchilton/artifact-detective/commit/658a346783576bb3a249b56501e6ea987297e911))
* add extraction test framework and command template ([a02be2d](https://github.com/jmchilton/artifact-detective/commit/a02be2da90ea859a0b904544372b028beeea133e))
* add gofmt-txt artifact type support ([424c645](https://github.com/jmchilton/artifact-detective/commit/424c645caa25b4c96c3ea9008cdfec4bb0ea74c8))
* add isort and black Python formatter support ([273c627](https://github.com/jmchilton/artifact-detective/commit/273c627e9f0c2e7674214e2d7f5aa94279b91ff9))
* add Ruby RSpec artifact support with sample project ([ec6f020](https://github.com/jmchilton/artifact-detective/commit/ec6f0205404d3df070ca0e96b302d131ffed77aa))
* **cli:** add command-line interface for artifact detection ([c1f6208](https://github.com/jmchilton/artifact-detective/commit/c1f6208bbea3b15087634198634051c13e190b0e))
* export ARTIFACT_TYPE_REGISTRY and enhanced type utilities ([ffd87c0](https://github.com/jmchilton/artifact-detective/commit/ffd87c006b0059090fa9310c7c5657211d885219))
* populate eslint-txt extraction test fixture with real CI log ([00cb092](https://github.com/jmchilton/artifact-detective/commit/00cb092ff41449e4f4b3ed86f38f2fc5f88a30c1))
* setup docsify documentation site structure ([72b94a4](https://github.com/jmchilton/artifact-detective/commit/72b94a4ddfb7e75ad5ac8604a3f42718b94ae047))

# [1.7.0](https://github.com/jmchilton/artifact-detective/compare/v1.6.0...v1.7.0) (2025-11-04)


### Bug Fixes

* recognize .sarif files as JSON format for proper detection ([0915f31](https://github.com/jmchilton/artifact-detective/commit/0915f31d300ab5fdb340cd7cd18e15c0ad8b20f5))


### Features

* add go-test-json and golangci-lint-json artifact types ([2d40b72](https://github.com/jmchilton/artifact-detective/commit/2d40b7261f5a49ba647ed4bf277d60f6a909bbaf))
* add NDJSON normalization for go-test-json ([574c9b0](https://github.com/jmchilton/artifact-detective/commit/574c9b0203605a9c8b19b2d11abcb6043be51a16))

# [1.6.0](https://github.com/jmchilton/artifact-detective/compare/v1.5.0...v1.6.0) (2025-11-04)

### Features

- add checkstyle-sarif-json artifact type support ([4dc3723](https://github.com/jmchilton/artifact-detective/commit/4dc3723ed67db681f57d6131e1053c3626baf62e))
- add jest-html fixture to JavaScript sample project ([06ddbd5](https://github.com/jmchilton/artifact-detective/commit/06ddbd56936d88969e5dc4464bb75f2f108a34f0))
- add surefire-html artifact type support ([cbe3c93](https://github.com/jmchilton/artifact-detective/commit/cbe3c9373b9d629ddb1740165090c1e9cd62b51a))
- implement jest-html to JSON converter ([ffcbc99](https://github.com/jmchilton/artifact-detective/commit/ffcbc99815defc4c1f16f40de917ca7c1f99d824))

# [1.5.0](https://github.com/jmchilton/artifact-detective/compare/v1.4.0...v1.5.0) (2025-11-04)

### Features

- add mypy-txt to JSON converter and normalizer ([e412e62](https://github.com/jmchilton/artifact-detective/commit/e412e625dad37b9816555802f1a69429b653f5c8))

# [1.4.0](https://github.com/jmchilton/artifact-detective/compare/v1.3.0...v1.4.0) (2025-11-04)

### Features

- add JSON export utility methods ([8e340e3](https://github.com/jmchilton/artifact-detective/commit/8e340e3bf2ffe3222f35a8d2d78f7d9903cc2149))
- add NDJSON normalizer for mypy-json and clippy-json ([49e5097](https://github.com/jmchilton/artifact-detective/commit/49e509733a2a2815361c00bb79d3c5df6f8d6efc))

# [1.3.0](https://github.com/jmchilton/artifact-detective/compare/v1.2.0...v1.3.0) (2025-11-03)

### Bug Fixes

- fix linting ([52dfe98](https://github.com/jmchilton/artifact-detective/commit/52dfe98cb6db5f4c2cf7be14db889a7ed236091d))
- generate all Java fixture artifacts and add Maven caching ([aa7d058](https://github.com/jmchilton/artifact-detective/commit/aa7d058923abdb8fcc71aa4cd6e9d6ab07fcf6a4))

### Features

- add auto-detection and validation for Java artifacts (Checkstyle, SpotBugs) ([2bfe762](https://github.com/jmchilton/artifact-detective/commit/2bfe762051729e6b9b9512b376123428b83a9022))
- Add claude command for adding new artifact fixtures to existing projects. ([a61b5e0](https://github.com/jmchilton/artifact-detective/commit/a61b5e0c70feb462ca709229c800562e00977c7b))
- add eslint-json artifact type support ([81f5694](https://github.com/jmchilton/artifact-detective/commit/81f56948a120a6e730cb3dccbb711ffa699efea7))
- add mypy-json artifact type support ([e71bb66](https://github.com/jmchilton/artifact-detective/commit/e71bb66e98e3717836c97a617dd15d19379ad3b0))
- Implement stronger validators. ([f591494](https://github.com/jmchilton/artifact-detective/commit/f5914949852d0bedf50e47be72c1d1dabf2fb2fb))

# [1.2.0](https://github.com/jmchilton/artifact-detective/compare/v1.1.0...v1.2.0) (2025-11-03)

### Features

- add Java maven sample project for fixture generation ([70a6ecc](https://github.com/jmchilton/artifact-detective/commit/70a6ecc00df3703173fefef162a286b507a54791))

# [1.1.0](https://github.com/jmchilton/artifact-detective/compare/v1.0.0...v1.1.0) (2025-11-03)

### Features

- add /setup-fixture-project command for automated sample project creation ([7d8504f](https://github.com/jmchilton/artifact-detective/commit/7d8504f08fd5426b9dedb22c7ea88475eca056ad))

# 1.0.0 (2025-11-03)

### Bug Fixes

- lower coverage threshold to 70% ([12790a3](https://github.com/jmchilton/artifact-detective/commit/12790a30c992f4675962d6100f58f93e26477fec))

### Features

- initial release ([de89a57](https://github.com/jmchilton/artifact-detective/commit/de89a57019b2fe86bd0df6491164fad845e4d4ef))

# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.
