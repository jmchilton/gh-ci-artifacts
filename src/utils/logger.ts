export class Logger {
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  info(message: string): void {
    console.error(message);
  }

  debug(message: string): void {
    if (this.debugMode) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  progress(message: string): void {
    console.error(message);
  }
}
