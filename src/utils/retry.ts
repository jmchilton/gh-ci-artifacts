export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  maxDelay?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const { maxRetries, retryDelay, maxDelay = 60 } = options;
  let lastError: Error | undefined;
  let currentDelay = retryDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return { success: true, data, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Check for 410 (expired) - no point retrying
        if (lastError.message.includes('410') || lastError.message.includes('expired')) {
          break;
        }

        // Check for Retry-After header hint in error message
        const retryAfterMatch = lastError.message.match(/retry after (\d+)/i);
        const waitTime = retryAfterMatch
          ? parseInt(retryAfterMatch[1], 10)
          : Math.min(currentDelay, maxDelay);

        await sleep(waitTime);
        currentDelay = Math.min(currentDelay * 2, maxDelay); // Exponential backoff
      }
    }
  }

  return {
    success: false,
    error: lastError ?? new Error('Unknown error'),
    attempts: maxRetries
  };
}

function sleep(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export function isRateLimitError(error: Error): boolean {
  return error.message.includes('429') ||
         error.message.includes('rate limit') ||
         error.message.includes('too many requests');
}

export function isExpiredError(error: Error): boolean {
  return error.message.includes('410') ||
         error.message.includes('expired');
}
