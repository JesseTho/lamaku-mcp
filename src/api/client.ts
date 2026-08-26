import { HOST, versionOverrides } from '../config.js';
import { AuthError, type AuthProvider } from '../auth/provider.js';
import { buildMultipartForm, buildMultipartMixed, type UploadPart } from './multipart.js';
import type { ProductVersions } from './types.js';

export class D2LApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
    readonly path: string,
  ) {
    super(message);
    this.name = 'D2LApiError';
  }
}

/**
 * Whether a 403 body is Brightspace saying "you are not signed in" rather than
 * "your role cannot do this". The first is recoverable by refreshing; the
 * second is not, and retrying it wastes a login prompt on a permission wall.
 */
function looksLikeAuthFailure(body: string): boolean {
  const head = body.slice(0, 500).toLowerCase();
  if (/authentication required|not authenticated|invalid token|session (has )?expired/.test(head)) {
    return true;
  }
  // A login page served where JSON was expected is the same signal.
  return /<form[^>]+login|d2l\/login/.test(head);
}

/**
 * Statuses worth retrying, by whether the request mutates anything.
 *
 * For a read, 429 and the transient 5xx family all mean "try again". For a
 * write they do not: a 502 or 504 is the gateway giving up, and the origin can
 * perfectly well have completed the write behind it. Retrying a POST there is
 * how a course build ends up with two copies of a module and nobody sure why.
 * So writes retry only on 429, where Brightspace refused before doing
 * anything. 500 is absent from both sets — Brightspace returns it for
 * malformed bodies, and retrying those just repeats the mistake more slowly.
 */
const RETRYABLE_READ = new Set([429, 502, 503, 504]);
const RETRYABLE_WRITE = new Set([429]);
const RETRY_LIMIT = 4;
const RETRY_BASE_MS = 500;
const RETRY_MAX_WAIT_MS = 20_000;

/** Exported for the tests: the retry decision, free of any I/O. */
export function canRetry(method: string, status: number): boolean {
  const mutating = method !== 'GET' && method !== 'HEAD';
  return (mutating ? RETRYABLE_WRITE : RETRYABLE_READ).has(status);
}

/**
 * Node's fetch has no default timeout, so one hung socket would hang a tool
 * call forever and the user would see nothing but a stuck assistant. Reads get
 * a minute; uploads and imports get ten, since a 500 MB video over campus
 * wifi is slow legitimately.
 */
const READ_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 600_000;

class RateLimiter {
  private tokens: number;
  private last = Date.now();

  constructor(
    private readonly capacity = 8,
    private readonly refillPerSecond = 4,
  ) {
    this.tokens = capacity;
  }

  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(
        this.capacity,
        this.tokens + ((now - this.last) / 1000) * this.refillPerSecond,
      );
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = ((1 - this.tokens) / this.refillPerSecond) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
    }
  }
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export interface GetOptions {
  /** Cache lifetime in seconds. 0 disables caching for this call. */
  cacheSeconds?: number;
  query?: Record<string, string | number | boolean | undefined>;
}

export class D2LClient {
  private readonly limiter = new RateLimiter();
  private readonly cache = new Map<string, CacheEntry>();
  private versions: Map<string, string> | null = null;

  constructor(
    private readonly auth: AuthProvider,
    readonly host: string = HOST,
  ) {
    if (/^https?:\/\//i.test(host)) {
      throw new Error('host must be a bare hostname, e.g. lamaku.hawaii.edu');
    }
  }

  private url(path: string, query?: GetOptions['query']): string {
    const url = new URL(`https://${this.host}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  /**
   * Brightspace versions its API per product component and bumps them on each
   * release, so resolve them at runtime rather than pinning and breaking.
   */
  async apiVersions(): Promise<Map<string, string>> {
    if (this.versions) return this.versions;

    const response = await fetch(this.url('/d2l/api/versions/'), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new D2LApiError(
        `Could not read API versions from ${this.host}`,
        response.status,
        await response.text().catch(() => ''),
        '/d2l/api/versions/',
      );
    }
    const products = (await response.json()) as ProductVersions[];
    this.versions = new Map(
      products.map((p) => [
        p.ProductCode,
        versionOverrides[p.ProductCode] ?? p.LatestVersion,
      ]),
    );
    return this.versions;
  }

  private async versionFor(product: 'lp' | 'le'): Promise<string> {
    const version = (await this.apiVersions()).get(product);
    if (!version) {
      throw new Error(`${this.host} does not expose the "${product}" API component.`);
    }
    return version;
  }

  /** Build a Learning Platform route, e.g. lp('/users/whoami'). */
  async lp(path: string): Promise<string> {
    return `/d2l/api/lp/${await this.versionFor('lp')}${path}`;
  }

  /** Build a Learning Environment route, e.g. le('/12345/grades/values/myGradeValues/'). */
  async le(path: string): Promise<string> {
    return `/d2l/api/le/${await this.versionFor('le')}${path}`;
  }

  private async request(
    method: string,
    path: string,
    init: { body?: string | Buffer; contentType?: string; query?: GetOptions['query'] },
    isRetry = false,
  ): Promise<Response> {
    await this.limiter.take();

    const mutating = method !== 'GET' && method !== 'HEAD';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(await this.auth.getHeaders(mutating)),
    };
    if (init.contentType) headers['Content-Type'] = init.contentType;

    const isUpload =
      typeof init.body !== 'string' && init.body !== undefined;
    const timeoutMs = isUpload ? UPLOAD_TIMEOUT_MS : READ_TIMEOUT_MS;

    let response = await fetch(this.url(path, init.query), {
      method,
      headers,
      body: init.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Reactive backoff, on top of the proactive token bucket above.
    //
    // The limiter keeps a single well-behaved client under the rate cap, but
    // it cannot know about other clients on the same account, a slow instance,
    // or a maintenance window. Retries are bounded, never applied to a 4xx
    // that means "this request is wrong", and never applied to a write on a
    // gateway error — see canRetry for why.
    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
      if (!canRetry(method, response.status)) break;

      // Brightspace sends Retry-After on 429, in seconds. Honour it when
      // present, since guessing shorter is how you stay rate limited.
      const header = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(header) && header > 0
        ? Math.min(header * 1000, RETRY_MAX_WAIT_MS)
        : Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_WAIT_MS);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      await this.limiter.take();
      response = await fetch(this.url(path, init.query), {
        method,
        headers,
        body: init.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
    }

    // A 302 to the login page is Brightspace's way of saying "session gone".
    let expired = response.status === 401 || response.status === 302;

    // An expired session does not always answer 401. Several routes answer 403
    // with the bare string "Authentication required", which is indistinguishable
    // from a real permission denial by status alone. Treating every 403 as an
    // expiry would be worse — restricted roles genuinely get 403 on the dropbox
    // routes — so the body is what separates them. Getting this wrong sends
    // someone hunting a permissions problem that does not exist.
    let forbiddenBody: string | null = null;
    if (!expired && response.status === 403) {
      forbiddenBody = await response.text().catch(() => '');
      if (looksLikeAuthFailure(forbiddenBody)) expired = true;
    }

    if (expired && !isRetry) {
      if (await this.auth.refresh()) {
        return this.request(method, path, init, true);
      }
      throw new AuthError(
        'Lamaku session has expired. Run `lamaku-mcp login` to sign in again.',
      );
    }
    if (expired) {
      throw new AuthError(
        'Lamaku rejected the session even after refreshing. Run `lamaku-mcp login`.',
      );
    }

    if (!response.ok) {
      const body = forbiddenBody ?? (await response.text().catch(() => ''));
      throw new D2LApiError(
        `${method} ${path} failed with HTTP ${response.status}`,
        response.status,
        body.slice(0, 2000),
        path,
      );
    }
    return response;
  }

  async get<T>(path: string, options: GetOptions = {}): Promise<T> {
    const cacheKey = `${path}?${JSON.stringify(options.query ?? {})}`;
    const ttl = options.cacheSeconds ?? 0;

    if (ttl > 0) {
      const hit = this.cache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    }

    const response = await this.request('GET', path, { query: options.query });
    const value = (await response.json()) as T;

    if (ttl > 0) {
      // Evict what has already expired before adding more. Without this the
      // map only ever loses an entry when the same key is re-read, and a long
      // session accumulates every response it ever cached.
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt <= now) this.cache.delete(key);
      }
      this.cache.set(cacheKey, { expiresAt: now + ttl * 1000, value });
    }
    return value;
  }

  async getBuffer(
    path: string,
    query?: GetOptions['query'],
  ): Promise<{ data: Buffer; filename: string | null; contentType: string | null }> {
    const response = await this.request('GET', path, { query });
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    return {
      data: Buffer.from(await response.arrayBuffer()),
      filename: match?.[1] ? decodeURIComponent(match[1]) : null,
      contentType: response.headers.get('content-type'),
    };
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request('POST', path, {
      body: JSON.stringify(body),
      contentType: 'application/json',
    });
    this.cache.clear();
    return (await this.parse<T>(response)) as T;
  }

  async putJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request('PUT', path, {
      body: JSON.stringify(body),
      contentType: 'application/json',
    });
    this.cache.clear();
    return (await this.parse<T>(response)) as T;
  }

  /** Most delete routes answer 200 with an empty body. */
  async delete(path: string): Promise<void> {
    await this.request('DELETE', path, {});
    this.cache.clear();
  }

  /** Simple file upload: multipart/form-data, one named part, no metadata. */
  async postForm<T>(path: string, file: UploadPart, fieldName = 'file'): Promise<T> {
    const { body, contentType } = buildMultipartForm(file, fieldName);
    const response = await this.request('POST', path, { body, contentType });
    this.cache.clear();
    return (await this.parse<T>(response)) as T;
  }

  async postMultipart<T>(
    path: string,
    metadata: unknown,
    files: UploadPart[],
  ): Promise<T> {
    const { body, contentType } = buildMultipartMixed(metadata, files);
    const response = await this.request('POST', path, { body, contentType });
    this.cache.clear();
    return (await this.parse<T>(response)) as T;
  }

  /** Some write routes answer 200 with an empty body. */
  private async parse<T>(response: Response): Promise<T | null> {
    const text = await response.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  /**
   * Walk a bookmark-paged route to completion. Handles both response shapes
   * Brightspace uses (`Items` on lp routes, `Objects` on le routes).
   */
  async getAllPages<T>(
    path: string,
    options: GetOptions = {},
    maxPages = 25,
  ): Promise<T[]> {
    const results: T[] = [];
    let bookmark: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const body = await this.get<{
        PagingInfo?: { Bookmark: string | null; HasMoreItems: boolean };
        Items?: T[];
        Objects?: T[];
      }>(path, { ...options, query: { ...options.query, bookmark } });

      results.push(...(body.Items ?? body.Objects ?? []));

      if (!body.PagingInfo?.HasMoreItems || !body.PagingInfo.Bookmark) break;
      bookmark = body.PagingInfo.Bookmark;
    }
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
