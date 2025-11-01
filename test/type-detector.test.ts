import { describe, it, expect } from 'vitest';
import { detectArtifactType } from '../src/detectors/type-detector.js';

describe('detectArtifactType', () => {
  it('detects playwright JSON', () => {
    const result = detectArtifactType('/path/to/playwright-results.json');
    expect(result.detectedType).toBe('playwright-json');
    expect(result.originalFormat).toBe('json');
    expect(result.isBinary).toBe(false);
  });

  it('detects playwright HTML', () => {
    const result = detectArtifactType('/path/to/playwright-report.html');
    expect(result.detectedType).toBe('playwright-html');
    expect(result.originalFormat).toBe('html');
    expect(result.isBinary).toBe(false);
  });

  it('detects jest JSON', () => {
    const result = detectArtifactType('/path/to/jest-results.json');
    expect(result.detectedType).toBe('jest-json');
    expect(result.originalFormat).toBe('json');
    expect(result.isBinary).toBe(false);
  });

  it('detects pytest JSON', () => {
    const result = detectArtifactType('/path/to/pytest-results.json');
    expect(result.detectedType).toBe('pytest-json');
    expect(result.originalFormat).toBe('json');
    expect(result.isBinary).toBe(false);
  });

  it('detects eslint text', () => {
    const result = detectArtifactType('/path/to/eslint-output.txt');
    expect(result.detectedType).toBe('eslint-txt');
    expect(result.originalFormat).toBe('txt');
    expect(result.isBinary).toBe(false);
  });

  it('detects binary PNG', () => {
    const result = detectArtifactType('/path/to/screenshot.png');
    expect(result.detectedType).toBe('binary');
    expect(result.originalFormat).toBe('binary');
    expect(result.isBinary).toBe(true);
  });

  it('detects binary video', () => {
    const result = detectArtifactType('/path/to/recording.mp4');
    expect(result.detectedType).toBe('binary');
    expect(result.originalFormat).toBe('binary');
    expect(result.isBinary).toBe(true);
  });

  it('detects generic JSON as unknown', () => {
    const result = detectArtifactType('/path/to/data.json');
    expect(result.detectedType).toBe('unknown');
    expect(result.originalFormat).toBe('json');
    expect(result.isBinary).toBe(false);
  });

  it('detects generic XML as unknown', () => {
    const result = detectArtifactType('/path/to/data.xml');
    expect(result.detectedType).toBe('unknown');
    expect(result.originalFormat).toBe('xml');
    expect(result.isBinary).toBe(false);
  });

  it('detects log files as text', () => {
    const result = detectArtifactType('/path/to/output.log');
    expect(result.detectedType).toBe('unknown');
    expect(result.originalFormat).toBe('txt');
    expect(result.isBinary).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = detectArtifactType('/path/to/PLAYWRIGHT-RESULTS.JSON');
    expect(result.detectedType).toBe('playwright-json');
  });
});
