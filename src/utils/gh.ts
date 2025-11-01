import { execSync } from 'child_process';

export function checkGhCli(): void {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    throw new Error(
      'GitHub CLI (gh) is not installed or not in PATH. Install from https://cli.github.com/'
    );
  }
}

export function checkGhAuth(): void {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    throw new Error(
      'GitHub CLI is not authenticated. Run: gh auth login'
    );
  }
}

export function getCurrentRepo(): string {
  try {
    const result = execSync('gh repo view --json nameWithOwner -q .nameWithOwner', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    throw new Error(
      'Could not detect current repository. Either provide owner/repo argument or run from within a git repository.'
    );
  }
}

export function validateGhSetup(): void {
  checkGhCli();
  checkGhAuth();
}
