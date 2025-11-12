# Type Definitions

Complete TypeScript type definitions are automatically generated from the source code using [TypeDoc](https://typedoc.org/).

## Interactive Type Documentation

📖 **[View Full Type Documentation →](typedoc/index.html)**

The TypeDoc documentation provides:
- **Complete type definitions** - All interfaces, types, and classes
- **Interactive navigation** - Browse by category (Interfaces, Types, Functions, Classes)
- **Search functionality** - Find types quickly
- **Source links** - Direct links to GitHub source code
- **Property details** - Full documentation for each property

## Quick Reference

### Key Types

- **[Config](typedoc/interfaces/Config.html)** - Configuration options
- **[Summary](typedoc/types/Summary.html)** - Analysis result (PRSummary | BranchSummary)
- **[CatalogEntry](typedoc/interfaces/CatalogEntry.html)** - Artifact catalog entry
- **[ArtifactInventoryItem](typedoc/interfaces/ArtifactInventoryItem.html)** - Downloaded artifact metadata
- **[WorkflowConfig](typedoc/interfaces/WorkflowConfig.html)** - Workflow-specific configuration

### Type Categories

**Interfaces:**
- Configuration: `Config`, `WorkflowConfig`, `ArtifactExtractionConfig`
- Artifacts: `CatalogEntry`, `ArtifactInventoryItem`, `LinterOutput`
- Validation: `ValidationResult`, `ExpectationViolation`
- References: `PRRef`, `BranchRef`
- Summaries: `PRSummary`, `BranchSummary`, `RunSummary`

**Type Aliases:**
- Status types: `SummaryStatus`, `DownloadStatus`, `ExtractionStatus`, `RunConclusion`
- Reference types: `Ref`, `RefType`
- Artifact types: `ArtifactType` (from artifact-detective)

**Classes:**
- `Logger` - Logging utility

**Functions:**
- `loadConfig()` - Load configuration from files
- `mergeConfig()` - Merge configurations
- `getOutputDir()` - Determine output directory
- `generateHtmlViewer()` - Generate HTML viewer
- `validateGhSetup()` - Validate GitHub CLI setup

## External Types

Some types are re-exported from `artifact-detective`:
- `ArtifactType` - Supported artifact types
- `OriginalFormat` - Original file formats (json/html/xml/txt)
- `ArtifactDescriptor` - Artifact metadata
- `ArtifactValidationResult` - Validation results

See the [artifact-detective documentation](https://jmchilton.github.io/artifact-detective/) for details on these types.

## Generating Documentation

TypeDoc documentation is generated automatically:

```bash
npm run docs:api
```

This generates HTML documentation in `docs/api/typedoc/` from `src/index.ts` exports.

## TypeScript Definitions

Type definitions are also available as `.d.ts` files in the published package:

```typescript
import type { Config, Summary, CatalogEntry } from 'gh-ci-artifacts';
```

All exported types from `src/index.ts` are available for import.
