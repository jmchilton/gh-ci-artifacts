import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRateLimitError, isExpiredError } from '../src/utils/retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 5 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 5 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('fails after max retries', async () => {
    const error = new Error('Persistent failure');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 5 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops retrying on 410 expired error', async () => {
    const error = new Error('410 Gone - artifact expired');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 5 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1); // Only one attempt
  });

  it('applies exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 2, maxDelay: 60 });

    // First attempt fails immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait 2 seconds for first retry
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Wait 4 seconds for second retry (exponential backoff: 2 * 2)
    await vi.advanceTimersByTimeAsync(4000);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects max delay cap', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxRetries: 3, retryDelay: 100, maxDelay: 60 });

    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Should wait maxDelay (60s) instead of retryDelay (100s)
    await vi.advanceTimersByTimeAsync(60000);
    const result = await promise;

    expect(result.success).toBe(true);
  });
});

describe('isRateLimitError', () => {
  it('detects 429 status', () => {
    expect(isRateLimitError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('detects rate limit message', () => {
    expect(isRateLimitError(new Error('API rate limit exceeded'))).toBe(true);
  });

  it('detects too many requests message', () => {
    expect(isRateLimitError(new Error('too many requests'))).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isRateLimitError(new Error('Not found'))).toBe(false);
  });
});

describe('isExpiredError', () => {
  it('detects 410 status', () => {
    expect(isExpiredError(new Error('410 Gone'))).toBe(true);
  });

  it('detects expired message', () => {
    expect(isExpiredError(new Error('Artifact has expired'))).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isExpiredError(new Error('Not found'))).toBe(false);
  });
});
