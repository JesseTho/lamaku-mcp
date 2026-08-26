import { AuthError } from '../auth/provider.js';
import { D2LApiError } from '../api/client.js';
import { ConfirmError } from '../confirm.js';
import { PRIVACY_MODE } from '../privacy.js';
import type { RichText } from '../api/types.js';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/**
 * Turns thrown errors into something an assistant can act on rather than a
 * stack trace. Auth problems in particular need to say exactly what to run.
 */
export async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError || error instanceof ConfirmError) {
      return fail(error.message);
    }
    if (error instanceof D2LApiError) {
      if (error.status === 403) {
        return fail(
          `Lamaku refused this request (403) on ${error.path}. Your student ` +
            `role may not permit it, or the item is not open to you right now.`,
        );
      }
      if (error.status === 404) {
        return fail(`Not found (404): ${error.path}. Check the ids you passed.`);
      }
      return fail(`${error.message}\n${safeErrorBody(error.body)}`);
    }
    return fail(error instanceof Error ? error.message : String(error));
  }
}

/**
 * What a failed response's body may say to the model.
 *
 * Everything the FERPA guard does applies to successful results; an error body
 * is raw Brightspace output and can carry whatever the route was about,
 * including the identities strict mode exists to withhold. So under strict,
 * only the fields of D2L's own error shape pass through — Message and Errors —
 * and anything else is summarised, with the full body on stderr where a person
 * debugging can read it and a transcript cannot.
 */
export function safeErrorBody(body: string): string {
  if (PRIVACY_MODE === 'off') return body;
  if (!body.trim()) return '';
  try {
    const parsed = JSON.parse(body) as {
      Message?: unknown;
      Errors?: { Message?: unknown }[];
    };
    const messages = [
      parsed.Message,
      ...(Array.isArray(parsed.Errors) ? parsed.Errors.map((e) => e?.Message) : []),
    ].filter((m): m is string => typeof m === 'string' && m.length > 0);
    if (messages.length > 0) return messages.join('; ');
  } catch {
    // Not JSON — fall through to the summary.
  }
  console.error('lamaku-mcp: full error body (withheld from the model):', body.slice(0, 2000));
  return `(response body withheld under the FERPA guard; the full body is on stderr)`;
}

/** Brightspace returns HTML almost everywhere; collapse it for reading. */
export function toText(rich: RichText | string | null | undefined): string {
  if (!rich) return '';
  if (typeof rich === 'string') return stripHtml(rich);
  return rich.Text?.trim() ? rich.Text.trim() : stripHtml(rich.Html ?? '');
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString();
}

/** Human-friendly "in 3 days" / "2 days ago" alongside the raw timestamp. */
export function relativeTo(iso: string | null | undefined, from = Date.now()): string | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - from;
  const past = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60_000);

  let phrase: string;
  if (minutes < 60) phrase = `${minutes} min`;
  else if (minutes < 60 * 24) phrase = `${Math.round(minutes / 60)} h`;
  else phrase = `${Math.round(minutes / (60 * 24))} d`;

  return past ? `${phrase} ago` : `in ${phrase}`;
}
