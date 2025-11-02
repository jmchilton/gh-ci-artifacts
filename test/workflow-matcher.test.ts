import { describe, it, expect } from 'vitest';
import {
  getWorkflowName,
  findWorkflowConfig,
  shouldSkipArtifact,
  getCombinedSkipPatterns,
  validateExpectations,
} from '../src/workflow-matcher.js';
import type { WorkflowRun } from '../src/github/api.js';
import type { WorkflowConfig, SkipPattern } from '../src/types.js';

describe('getWorkflowName', () => {
  it('extracts workflow name from .yml path', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'CI',
      path: '.github/workflows/ci.yml',
      conclusion: 'success',
      status: 'completed',
    };
    expect(getWorkflowName(run)).toBe('ci');
  });

  it('extracts workflow name from .yaml path', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'Tests',
      path: '.github/workflows/tests.yaml',
      conclusion: 'success',
      status: 'completed',
    };
    expect(getWorkflowName(run)).toBe('tests');
  });

  it('handles hyphenated workflow names', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'E2E Tests',
      path: '.github/workflows/e2e-tests.yml',
      conclusion: 'success',
      status: 'completed',
    };
    expect(getWorkflowName(run)).toBe('e2e-tests');
  });

  it('handles nested workflow paths', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'Deploy',
      path: '.github/workflows/deploy/production.yml',
      conclusion: 'success',
      status: 'completed',
    };
    expect(getWorkflowName(run)).toBe('production');
  });
});

describe('findWorkflowConfig', () => {
  const configs: WorkflowConfig[] = [
    { workflow: 'ci', description: 'CI workflow' },
    { workflow: 'e2e', skip: true },
    { workflow: 'deploy', skipArtifacts: [{ pattern: '.*-logs$' }] },
  ];

  it('finds matching workflow config', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'CI',
      path: '.github/workflows/ci.yml',
      conclusion: 'success',
      status: 'completed',
    };
    const config = findWorkflowConfig(run, configs);
    expect(config).toBeDefined();
    expect(config?.workflow).toBe('ci');
  });

  it('returns undefined when no config matches', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'Unknown',
      path: '.github/workflows/unknown.yml',
      conclusion: 'success',
      status: 'completed',
    };
    const config = findWorkflowConfig(run, configs);
    expect(config).toBeUndefined();
  });

  it('matches workflow with .yaml extension', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'E2E',
      path: '.github/workflows/e2e.yaml',
      conclusion: 'success',
      status: 'completed',
    };
    const config = findWorkflowConfig(run, configs);
    expect(config).toBeDefined();
    expect(config?.skip).toBe(true);
  });

  it('returns undefined for empty config array', () => {
    const run: WorkflowRun = {
      id: 123,
      name: 'CI',
      path: '.github/workflows/ci.yml',
      conclusion: 'success',
      status: 'completed',
    };
    const config = findWorkflowConfig(run, []);
    expect(config).toBeUndefined();
  });
});

describe('shouldSkipArtifact', () => {
  it('returns pattern when artifact matches', () => {
    const patterns: SkipPattern[] = [
      { pattern: '.*-screenshots$', reason: 'No screenshots needed' },
    ];
    const result = shouldSkipArtifact('test-screenshots', patterns);
    expect(result).toBeDefined();
    expect(result?.reason).toBe('No screenshots needed');
  });

  it('returns undefined when artifact does not match', () => {
    const patterns: SkipPattern[] = [
      { pattern: '.*-screenshots$', reason: 'No screenshots needed' },
    ];
    const result = shouldSkipArtifact('test-results', patterns);
    expect(result).toBeUndefined();
  });

  it('returns first matching pattern', () => {
    const patterns: SkipPattern[] = [
      { pattern: '.*-videos$', reason: 'No videos' },
      { pattern: 'test-.*', reason: 'No test artifacts' },
    ];
    const result = shouldSkipArtifact('test-videos', patterns);
    expect(result).toBeDefined();
    expect(result?.reason).toBe('No videos');
  });

  it('handles pattern without reason', () => {
    const patterns: SkipPattern[] = [{ pattern: '.*-debug$' }];
    const result = shouldSkipArtifact('app-debug', patterns);
    expect(result).toBeDefined();
    expect(result?.reason).toBeUndefined();
  });

  it('handles complex regex patterns', () => {
    const patterns: SkipPattern[] = [
      { pattern: '^(screenshots|videos|traces).*', reason: 'Media files' },
    ];
    expect(shouldSkipArtifact('screenshots-chrome', patterns)).toBeDefined();
    expect(shouldSkipArtifact('videos-firefox', patterns)).toBeDefined();
    expect(shouldSkipArtifact('traces-safari', patterns)).toBeDefined();
    expect(shouldSkipArtifact('test-results', patterns)).toBeUndefined();
  });

  it('returns undefined for empty patterns array', () => {
    const result = shouldSkipArtifact('any-artifact', []);
    expect(result).toBeUndefined();
  });

  it('handles multiple patterns with no match', () => {
    const patterns: SkipPattern[] = [
      { pattern: '.*-screenshots$' },
      { pattern: '.*-videos$' },
      { pattern: '.*-traces$' },
    ];
    const result = shouldSkipArtifact('test-results', patterns);
    expect(result).toBeUndefined();
  });

  it('is case-sensitive by default', () => {
    const patterns: SkipPattern[] = [{ pattern: 'SCREENSHOTS' }];
    expect(shouldSkipArtifact('SCREENSHOTS', patterns)).toBeDefined();
    expect(shouldSkipArtifact('screenshots', patterns)).toBeUndefined();
  });
});

describe('getCombinedSkipPatterns', () => {
  it('combines global and workflow patterns', () => {
    const global: SkipPattern[] = [{ pattern: 'global-.*' }];
    const workflow: SkipPattern[] = [{ pattern: 'workflow-.*' }];
    const combined = getCombinedSkipPatterns(global, workflow);
    expect(combined).toHaveLength(2);
    expect(combined[0].pattern).toBe('global-.*');
    expect(combined[1].pattern).toBe('workflow-.*');
  });

  it('handles empty global patterns', () => {
    const workflow: SkipPattern[] = [{ pattern: 'workflow-.*' }];
    const combined = getCombinedSkipPatterns([], workflow);
    expect(combined).toHaveLength(1);
    expect(combined[0].pattern).toBe('workflow-.*');
  });

  it('handles empty workflow patterns', () => {
    const global: SkipPattern[] = [{ pattern: 'global-.*' }];
    const combined = getCombinedSkipPatterns(global, []);
    expect(combined).toHaveLength(1);
    expect(combined[0].pattern).toBe('global-.*');
  });

  it('handles both empty', () => {
    const combined = getCombinedSkipPatterns([], []);
    expect(combined).toHaveLength(0);
  });

  it('handles undefined patterns', () => {
    const combined = getCombinedSkipPatterns(undefined, undefined);
    expect(combined).toHaveLength(0);
  });

  it('preserves pattern order (global first)', () => {
    const global: SkipPattern[] = [
      { pattern: 'a', reason: '1' },
      { pattern: 'b', reason: '2' },
    ];
    const workflow: SkipPattern[] = [
      { pattern: 'c', reason: '3' },
      { pattern: 'd', reason: '4' },
    ];
    const combined = getCombinedSkipPatterns(global, workflow);
    expect(combined).toEqual([
      { pattern: 'a', reason: '1' },
      { pattern: 'b', reason: '2' },
      { pattern: 'c', reason: '3' },
      { pattern: 'd', reason: '4' },
    ]);
  });
});

describe('validateExpectations', () => {
  const createRun = (path: string): WorkflowRun => ({
    id: 12345,
    name: 'CI',
    path,
    conclusion: 'success',
    status: 'completed',
  });

  it('returns undefined when no expectations configured', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
    };
    const result = validateExpectations(run, config, ['test-results']);
    expect(result).toBeUndefined();
  });

  it('returns undefined when workflow config is undefined', () => {
    const run = createRun('.github/workflows/ci.yml');
    const result = validateExpectations(run, undefined, ['test-results']);
    expect(result).toBeUndefined();
  });

  it('returns undefined when all expectations are met', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [
        { pattern: 'test-results' },
        { pattern: 'coverage-.*' },
      ],
    };
    const result = validateExpectations(run, config, [
      'test-results',
      'coverage-report',
    ]);
    expect(result).toBeUndefined();
  });

  it('detects missing required artifacts', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [
        {
          pattern: 'test-results',
          required: true,
          reason: 'Test results always expected',
        },
      ],
    };
    const result = validateExpectations(run, config, ['other-artifact']);
    expect(result).toBeDefined();
    expect(result!.missingRequired).toHaveLength(1);
    expect(result!.missingRequired[0].pattern).toBe('test-results');
    expect(result!.missingRequired[0].reason).toBe('Test results always expected');
  });

  it('detects missing optional artifacts', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [
        {
          pattern: 'coverage-.*',
          required: false,
          reason: 'Coverage optional',
        },
      ],
    };
    const result = validateExpectations(run, config, ['test-results']);
    expect(result).toBeDefined();
    expect(result!.missingOptional).toHaveLength(1);
    expect(result!.missingOptional[0].pattern).toBe('coverage-.*');
  });

  it('defaults to required when not specified', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [{ pattern: 'test-results' }],
    };
    const result = validateExpectations(run, config, ['other-artifact']);
    expect(result).toBeDefined();
    expect(result!.missingRequired).toHaveLength(1);
    expect(result!.missingOptional).toHaveLength(0);
  });

  it('includes workflow information in result', () => {
    const run = createRun('.github/workflows/e2e-tests.yml');
    const config: WorkflowConfig = {
      workflow: 'e2e-tests',
      expectArtifacts: [{ pattern: 'playwright-report' }],
    };
    const result = validateExpectations(run, config, []);
    expect(result).toBeDefined();
    expect(result!.workflowName).toBe('e2e-tests');
    expect(result!.workflowPath).toBe('.github/workflows/e2e-tests.yml');
    expect(result!.runId).toBe('12345');
    expect(result!.runName).toBe('CI');
  });

  it('handles regex patterns in expectations', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [
        { pattern: 'test-results-.*' },
        { pattern: 'coverage-(html|json)' },
      ],
    };
    const result = validateExpectations(run, config, [
      'test-results-unit',
      'coverage-html',
    ]);
    expect(result).toBeUndefined();
  });

  it('reports multiple missing artifacts', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [
        { pattern: 'test-results', required: true },
        { pattern: 'coverage', required: true },
        { pattern: 'lint-report', required: false },
      ],
    };
    const result = validateExpectations(run, config, []);
    expect(result).toBeDefined();
    expect(result!.missingRequired).toHaveLength(2);
    expect(result!.missingOptional).toHaveLength(1);
  });

  it('handles empty artifact list', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [{ pattern: 'test-results' }],
    };
    const result = validateExpectations(run, config, []);
    expect(result).toBeDefined();
    expect(result!.missingRequired).toHaveLength(1);
  });

  it('matches partial artifact names correctly', () => {
    const run = createRun('.github/workflows/ci.yml');
    const config: WorkflowConfig = {
      workflow: 'ci',
      expectArtifacts: [{ pattern: '.*playwright.*' }],
    };
    const result = validateExpectations(run, config, [
      'my-playwright-report-123',
    ]);
    expect(result).toBeUndefined();
  });
});

