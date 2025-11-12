# Contributing

Thank you for your interest in contributing to `gh-ci-artifacts`! This document provides guidelines for contributing.

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- npm (comes with Node.js)
- Git
- GitHub CLI (`gh`) - for testing CLI functionality

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gh-ci-artifacts.git
   cd gh-ci-artifacts
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Making Changes

1. **Make your changes** in the appropriate files
2. **Write tests** for new functionality
3. **Run tests** to ensure everything passes:
   ```bash
   npm test
   ```
4. **Check formatting:**
   ```bash
   npm run check-format
   ```
5. **Type check:**
   ```bash
   npm run lint
   ```

### Testing Your Changes

**Run unit tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run with coverage:**
```bash
npm run test:coverage
```

**Test CLI locally:**
```bash
npm run dev -- 123 --repo owner/repo --debug
```

### Code Style

**Format code:**
```bash
npm run format
```

**Key style guidelines:**
- Use TypeScript strict mode
- Use ES modules (`.js` extensions in imports)
- Follow existing code style
- Write concise, clear code
- Add comments for complex logic

## Pull Request Process

### Before Submitting

1. **Ensure tests pass:**
   ```bash
   npm test
   ```

2. **Ensure code is formatted:**
   ```bash
   npm run format
   ```

3. **Ensure type checking passes:**
   ```bash
   npm run lint
   ```

4. **Update documentation** if needed

5. **Update CHANGELOG** (if applicable - semantic-release handles this automatically)

### Submitting a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template:**
   - Describe your changes
   - Link to related issues
   - Include test coverage information

### PR Requirements

- ✅ All tests pass
- ✅ Code is formatted
- ✅ Type checking passes
- ✅ Coverage meets threshold (75%)
- ✅ Documentation updated (if needed)
- ✅ Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions/changes
- `chore` - Build process or auxiliary tool changes

### Examples

```
feat(config): add support for YAML config files

Add support for .gh-ci-artifacts.yml and .gh-ci-artifacts.yaml
config files in addition to JSON.

Closes #123
```

```
fix(downloader): handle expired artifacts gracefully

Previously, expired artifacts would cause the download to fail.
Now they are marked as "expired" and processing continues.

Fixes #456
```

## Areas for Contribution

### High Priority

- **Bug fixes** - Fix issues reported in GitHub Issues
- **Documentation** - Improve documentation clarity and completeness
- **Test coverage** - Add tests for uncovered code paths

### Feature Ideas

- **Artifact type support** - Contribute to [artifact-detective](https://github.com/jmchilton/artifact-detective) for new artifact types
- **Performance improvements** - Optimize download or processing speed
- **Error handling** - Improve error messages and recovery

### Code Quality

- **Type safety** - Improve TypeScript types
- **Code organization** - Refactor for better maintainability
- **Test utilities** - Add reusable test helpers

## Adding New Features

### New Artifact Type Support

To add support for a new artifact type:

1. **Contribute to artifact-detective** - This project uses `artifact-detective` for type detection
2. **Update tests** - Add test fixtures for the new type
3. **Update documentation** - Document the new type

### New CLI Options

To add a new CLI option:

1. **Add option** in `src/cli.ts`
2. **Update config types** in `src/types.ts`
3. **Update config schema** in `src/config-schema.ts`
4. **Add tests** for the new option
5. **Update documentation**

### New Configuration Options

To add a new configuration option:

1. **Add to `Config` interface** in `src/types.ts`
2. **Add to Zod schema** in `src/config-schema.ts`
3. **Update `mergeConfig`** in `src/config.ts`
4. **Add tests** for config loading/merging
5. **Update documentation**

## Testing Guidelines

### Writing Tests

1. **Test new functionality** - Every new feature should have tests
2. **Test edge cases** - Include boundary conditions and error cases
3. **Use fixtures** - Don't hardcode test data
4. **Keep tests isolated** - Each test should be independent

### Test Coverage

- **Aim for 75%+ coverage** - Current threshold
- **Focus on critical paths** - Test important functionality thoroughly
- **Don't test implementation** - Test behavior, not internals

## Documentation

### Code Documentation

- **Add JSDoc comments** for public APIs
- **Document complex logic** with inline comments
- **Keep comments up to date** - Update when code changes

### User Documentation

- **Update README** if CLI behavior changes
- **Update feature docs** if features change
- **Add examples** for new functionality

## Release Process

Releases are automated via **semantic-release**:

1. **Analyzes commit messages** - Determines version bump
2. **Updates version** - Automatically bumps version
3. **Updates CHANGELOG** - Generates changelog from commits
4. **Publishes to npm** - Publishes new version
5. **Creates GitHub release** - Creates release on GitHub

**No manual release steps needed** - Just merge PRs with conventional commits!

## Getting Help

### Questions?

- **Open an issue** - For questions or discussions
- **Check existing issues** - Your question may already be answered
- **Review documentation** - Check the docs first

### Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to reproduce** - How to trigger the bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment** - Node.js version, OS, etc.
6. **Logs** - Relevant error messages or logs

### Feature Requests

When requesting features, please include:

1. **Use case** - Why is this feature needed?
2. **Proposed solution** - How should it work?
3. **Alternatives** - Other solutions considered
4. **Impact** - Who would benefit?

## Code of Conduct

### Be Respectful

- Be kind and respectful to all contributors
- Welcome newcomers and help them learn
- Accept constructive criticism gracefully

### Be Collaborative

- Work together to improve the project
- Share knowledge and help others
- Focus on what's best for the project

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

## Recognition

Contributors are recognized in:

- **GitHub Contributors** - Automatically listed on GitHub
- **CHANGELOG** - Mentioned in release notes (via semantic-release)

## See Also

- [Building](building.md) - Build process
- [Testing](testing.md) - Testing strategy
- [GitHub Issues](https://github.com/jmchilton/gh-ci-artifacts/issues) - Report bugs or request features
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message format

Thank you for contributing! 🎉
