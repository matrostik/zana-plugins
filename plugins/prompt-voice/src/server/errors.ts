import type { PromptVoiceErrorCode } from '../shared/protocol.ts';

/**
 * An error the user can act on.
 *
 * `userMessage` is safe to show in the composer. `detail` is for the server log only
 * and must never include transcript text, audio, or API keys.
 */
export class PromptVoiceError extends Error {
  readonly code: PromptVoiceErrorCode;
  readonly userMessage: string;
  readonly status?: number;
  readonly detail?: string;

  constructor(code: PromptVoiceErrorCode, userMessage: string, options: { status?: number; detail?: string } = {}) {
    super(options.detail ?? userMessage);
    this.name = 'PromptVoiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export function missingKeyError(providerLabel: string): PromptVoiceError {
  return new PromptVoiceError('MISSING_KEY', `Add your ${providerLabel} API key in Prompt Voice settings.`);
}

const NETWORK_ERROR_PATTERN = /enotfound|econnrefused|econnreset|etimedout|fetch failed|network error/i;

/** Maps an HTTP status from a provider to a user-facing message. Ported from prompt-voice `llmErrors.ts`. */
export function describeHttpStatus(label: string, status: number, model?: string): string {
  if (status === 429) return `${label} quota or rate limit exceeded. Check your plan, or try again shortly.`;
  if (status === 401 || status === 403) return `Invalid or expired ${label} API key. Check it in Prompt Voice settings.`;
  if (status === 404) return `Model "${model || 'selected'}" is not available for ${label}. Choose another model in Prompt Voice settings.`;
  if (status >= 500 || status === 529) return `${label} is overloaded or unavailable. Try again shortly.`;
  return `${label} request failed (HTTP ${status}).`;
}

/**
 * Message for any error raised while calling a provider. Known errors keep their
 * user message; unknown errors get a generic message so internals never reach the UI.
 */
export function describeProviderError(error: unknown, label: string, model?: string): string {
  if (error instanceof PromptVoiceError) return error.userMessage;
  if (isTimeoutError(error)) return `${label} request timed out. Check your connection and try again.`;
  const message = error instanceof Error ? error.message : String(error);
  if (NETWORK_ERROR_PATTERN.test(message)) return `Network error connecting to ${label}. Check your internet connection.`;
  return `${label} request failed${model ? ` (model ${model})` : ''}. See the Zana log for details.`;
}

/** Error names and codes are kept only if they look like identifiers; anything else may echo content. */
const SAFE_ERROR_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

function safeErrorToken(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_ERROR_TOKEN_PATTERN.test(value) ? value : undefined;
}

/**
 * Log-safe description of an unexpected (non-PromptVoiceError) provider failure. Keeps only a
 * classification, the error name, and a system error code (for example ECONNREFUSED). The
 * error message is never included: parse errors such as a JSON SyntaxError can quote the
 * response body, which may contain transcript text.
 */
export function describeUnexpectedFailure(error: unknown, label: string, model?: string): string {
  const kind = isTimeoutError(error)
    ? 'timeout'
    : error instanceof Error && NETWORK_ERROR_PATTERN.test(error.message)
      ? 'network'
      : 'unexpected';
  const name = error instanceof Error ? safeErrorToken(error.name) : undefined;
  const cause = error instanceof Error ? (error as { cause?: { code?: unknown } }).cause : undefined;
  const code = safeErrorToken(cause?.code) ?? safeErrorToken((error as { code?: unknown } | null)?.code);
  const fields = [`kind=${kind}`, ...(name ? [`name=${name}`] : []), ...(code ? [`code=${code}`] : [])];
  return `${label} request error${model ? ` for model ${model}` : ''} (${fields.join(', ')})`;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
