import { readFileSync, statSync } from 'fs';
import type { ArtifactType, OriginalFormat } from '../types.js';

export interface DetectionResult {
  detectedType: ArtifactType;
  originalFormat: OriginalFormat;
  isBinary: boolean;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mov',
  '.zip', '.tar', '.gz', '.bz2',
  '.exe', '.dll', '.so', '.dylib',
]);

export function detectArtifactType(filePath: string): DetectionResult {
  const fileName = filePath.toLowerCase();

  // Check for binary files first
  if (isBinaryFile(fileName)) {
    return {
      detectedType: 'binary',
      originalFormat: 'binary',
      isBinary: true,
    };
  }

  // Detect by filename patterns
  // Playwright
  if (fileName.includes('playwright')) {
    if (fileName.endsWith('.json')) {
      return {
        detectedType: 'playwright-json',
        originalFormat: 'json',
        isBinary: false,
      };
    }
    if (fileName.endsWith('.html')) {
      return {
        detectedType: 'playwright-html',
        originalFormat: 'html',
        isBinary: false,
      };
    }
  }

  // Jest
  if (fileName.includes('jest') && fileName.endsWith('.json')) {
    return {
      detectedType: 'jest-json',
      originalFormat: 'json',
      isBinary: false,
    };
  }

  // Pytest
  if (fileName.includes('pytest') || fileName.includes('test-results')) {
    if (fileName.endsWith('.json')) {
      return {
        detectedType: 'pytest-json',
        originalFormat: 'json',
        isBinary: false,
      };
    }
    if (fileName.endsWith('.html')) {
      return {
        detectedType: 'playwright-html', // pytest-html would be similar
        originalFormat: 'html',
        isBinary: false,
      };
    }
  }

  // JUnit XML
  if (fileName.endsWith('.xml')) {
    // Check content for JUnit signature
    try {
      const content = readFileSync(filePath, 'utf-8');
      if (content.includes('<testsuite') || content.includes('<testsuites')) {
        return {
          detectedType: 'junit-xml',
          originalFormat: 'xml',
          isBinary: false,
        };
      }
    } catch {
      // Ignore read errors, fall through to unknown
    }
  }

  // ESLint/linter outputs (text files)
  if (fileName.includes('eslint') || fileName.includes('lint')) {
    return {
      detectedType: 'eslint-txt',
      originalFormat: 'txt',
      isBinary: false,
    };
  }

  // Generic formats
  if (fileName.endsWith('.json')) {
    return {
      detectedType: 'unknown',
      originalFormat: 'json',
      isBinary: false,
    };
  }

  if (fileName.endsWith('.xml')) {
    return {
      detectedType: 'unknown',
      originalFormat: 'xml',
      isBinary: false,
    };
  }

  if (fileName.endsWith('.html')) {
    return {
      detectedType: 'unknown',
      originalFormat: 'html',
      isBinary: false,
    };
  }

  if (fileName.endsWith('.txt') || fileName.endsWith('.log')) {
    return {
      detectedType: 'unknown',
      originalFormat: 'txt',
      isBinary: false,
    };
  }

  return {
    detectedType: 'unknown',
    originalFormat: 'binary',
    isBinary: true,
  };
}

function isBinaryFile(fileName: string): boolean {
  return Array.from(BINARY_EXTENSIONS).some(ext => fileName.endsWith(ext));
}
