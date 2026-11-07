import { describeHttpStatus, PromptVoiceError } from './errors.ts';
import type { PromptVoiceErrorCode } from '../shared/protocol.ts';

export type FetchLike = typeof fetch;

/** Per-request timeout for provider calls. Dictation should fail fast rather than hang the composer. */
export const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * Provider error bodies can echo submitted content or credentials, so they are never logged.
 * Only short identifier-like fields (error code/type/status, request ID) are kept for diagnosis.
 */
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

/** Response headers that carry a provider request ID (OpenAI, Anthropic, Google). */
const REQUEST_ID_HEADERS = ['x-request-id', 'request-id', 'x-goog-request-id'];

function safeIdentifier(value: unknown): string | undefined {
  const text = typeof value === 'number' ? String(value) : value;
  return typeof text === 'string' && SAFE_IDENTIFIER_PATTERN.test(text) ? text : undefined;
}

/**
 * Extracts allowlisted error identifiers from a provider error body. Covers OpenAI
 * (`error.type`/`error.code`), Anthropic (`error.type`) and Google (`error.status`/`error.code`).
 * Messages and any other fields are dropped.
 */
function errorIdentifiers(body: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  const error = (parsed as { error?: unknown } | null)?.error;
  if (typeof error !== 'object' || error === null) return [];
  const { type, code, status } = error as Record<string, unknown>;
  return [
    ['type', type],
    ['code', code],
    ['status', status]
  ].flatMap(([name, value]) => {
    const safe = safeIdentifier(value);
    return safe ? [`${name}=${safe}`] : [];
  });
}

function requestIdOf(response: Response): string | undefined {
  for (const header of REQUEST_ID_HEADERS) {
    const id = safeIdentifier(response.headers.get(header));
    if (id) return id;
  }
  return undefined;
}

/** Log-safe description of a failed provider response. Never includes the raw body. */
export function describeProviderFailure(response: Response, body: string, call: ProviderCall): string {
  const requestId = requestIdOf(response);
  const fields = [...errorIdentifiers(body), ...(requestId ? [`request_id=${requestId}`] : [])];
  const suffix = fields.length > 0 ? ` (${fields.join(', ')})` : '';
  return `${call.label} HTTP ${response.status} for model ${call.model}${suffix}`;
}

export interface ProviderCall {
  /** Human label used in user-facing messages, for example "OpenAI". */
  label: string;
  /** Error code to raise on failure: STT_FAILED or LLM_FAILED. */
  code: PromptVoiceErrorCode;
  model: string;
}

/**
 * Sends a request with the plugin timeout applied. Non-2xx responses become a
 * PromptVoiceError with a safe user message. Only allowlisted identifiers from the
 * body go to the detail field (for logs). Transport errors propagate unchanged for the caller to classify.
 */
export async function sendRequest(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  call: ProviderCall
): Promise<Response> {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  if (response.ok) return response;

  const body = await response.text().catch(() => '');
  throw new PromptVoiceError(call.code, describeHttpStatus(call.label, response.status, call.model), {
    status: response.status,
    detail: describeProviderFailure(response, body, call)
  });
}

/**
 * Parses a provider JSON response. A malformed body becomes a PromptVoiceError whose detail
 * keeps only the request ID, because the parser's message can quote part of the body.
 */
export async function parseJsonResponse<T>(response: Response, call: ProviderCall): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    const requestId = requestIdOf(response);
    throw new PromptVoiceError(
      call.code,
      `${call.label} returned an unreadable response. Try again.`,
      {
        status: response.status,
        detail: `${call.label} returned malformed JSON for model ${call.model}${requestId ? ` (request_id=${requestId})` : ''}`
      }
    );
  }
}

/** POSTs a JSON body and parses the JSON response. */
export async function postJson<T>(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  call: ProviderCall
): Promise<T> {
  const response = await sendRequest(
    fetchImpl,
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) },
    call
  );
  return parseJsonResponse<T>(response, call);
}
