const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function extractMessage(input: unknown): string {
  if (typeof input === 'string') return input;

  if (input instanceof Error) {
    return input.message || GENERIC_ERROR_MESSAGE;
  }

  if (input && typeof input === 'object') {
    const candidate = input as Record<string, unknown>;
    const possibleKeys = ['message', 'error', 'details', 'reason'];

    for (const key of possibleKeys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return GENERIC_ERROR_MESSAGE;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function toUserFriendlyToastError(input: unknown): string {
  const raw = normalizeWhitespace(extractMessage(input));
  const lower = raw.toLowerCase();

  if (!raw || lower === 'error' || lower === 'failed' || lower === 'unknown error') {
    return GENERIC_ERROR_MESSAGE;
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('invalid access token') ||
    lower.includes('token expired') ||
    lower.includes('forbidden') ||
    lower.includes('status 401')
  ) {
    return 'Your session has expired. Please sign in and try again.';
  }

  if (
    lower.includes('network error') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('timeout') ||
    lower.includes('timed out')
  ) {
    return 'Unable to reach our servers. Please check your internet connection and try again.';
  }

  if (lower.includes('internal server error')) {
    return 'We are facing a temporary issue on our side. Please try again in a moment.';
  }

  if (lower === 'payment failed') {
    return 'Payment could not be completed. Please try again or use another payment method.';
  }

  const stripped = normalizeWhitespace(raw.replace(/^(error|exception)\s*[:\-]?\s*/i, ''));
  if (!stripped) {
    return GENERIC_ERROR_MESSAGE;
  }

  return stripped;
}
