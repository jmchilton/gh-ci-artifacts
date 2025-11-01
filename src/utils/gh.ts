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

export function validateGhSetup(): void {
  checkGhCli();
  checkGhAuth();
}
