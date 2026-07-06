import { AxiosError } from 'axios';

/**
 * Determines if a mutation should be retried.
 * Retries are safe for idempotent operations when network errors or 5xx server errors occur.
 * 
 * @param failureCount Number of times the request has failed so far
 * @param error The error thrown by the request
 * @param maxRetries Maximum number of retries allowed (default: 2)
 * @returns boolean
 */
export function shouldRetryMutation(failureCount: number, error: unknown, maxRetries = 2): boolean {
  if (failureCount > maxRetries) {
    return false;
  }

  if (error instanceof AxiosError) {
    // Network error (no response)
    if (!error.response) {
      return true;
    }
    // 5xx Server errors
    const status = error.response.status;
    if (status >= 500 && status <= 599) {
      return true;
    }
  }

  return false;
}
