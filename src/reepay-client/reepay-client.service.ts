import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ReepayClientException } from './reepay-client.exception';
import {
  HttpMethod,
  ReepayErrorResponse,
  ReepayRequestOptions,
  ReepaySuccessResponse,
} from './reepay-client.types';

const DEFAULT_TIMEOUT_MS = 15_000;
const SAFE_READ_RETRIES = 2;

@Injectable()
export class ReepayClientService {
  private readonly logger = new Logger(ReepayClientService.name);

  constructor(private readonly config: ConfigService) {}

  get<T>(path: string, options: ReepayRequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options: ReepayRequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  put<T>(path: string, options: ReepayRequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  patch<T>(path: string, options: ReepayRequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  delete<T>(path: string, options: ReepayRequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: ReepayRequestOptions = {},
  ): Promise<T> {
    const requestOptions = {
      ...options,
      requestId: options.requestId ?? randomUUID(),
    };
    const attempts = method === 'GET' ? SAFE_READ_RETRIES + 1 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.send<T>(method, path, requestOptions, attempt);
      } catch (error) {
        lastError = error;

        if (error instanceof ReepayClientException) {
          throw error;
        }

        if (attempt >= attempts) {
          throw this.toTimeoutException(path, requestOptions.requestId, error);
        }
      }
    }

    throw this.toTimeoutException(path, requestOptions.requestId, lastError);
  }

  private async send<T>(
    method: HttpMethod,
    path: string,
    options: ReepayRequestOptions,
    attempt: number,
  ): Promise<T> {
    const requestId = options.requestId ?? randomUUID();
    const startedAt = process.hrtime.bigint();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const url = this.buildUrl(path, options.query);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(requestId, options),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const payload = await this.parseJson(response);
      const reepayRequestId = this.extractReepayRequestId(payload);

      this.logRequest({
        method,
        path,
        statusCode: response.status,
        requestId,
        reepayRequestId,
        attempt,
        startedAt,
      });

      if (!response.ok) {
        throw this.toReepayException(response.status, requestId, payload);
      }

      return this.unwrapData<T>(payload, requestId);
    } catch (error) {
      if (error instanceof ReepayClientException) {
        throw error;
      }

      this.logRequest({
        method,
        path,
        requestId,
        attempt,
        startedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: ReepayRequestOptions['query']): string {
    const baseUrl = this.config.getOrThrow<string>('REEPAY_BASE_URL').replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${normalizedPath}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private buildHeaders(requestId: string, options: ReepayRequestOptions): Headers {
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Reepay-Api-Key': this.config.getOrThrow<string>('SANGAPAY_REEPAY_API_KEY'),
      'X-Reepay-Application-Id': this.config.getOrThrow<string>('SANGAPAY_REEPAY_APPLICATION_ID'),
      'X-Request-Id': requestId,
    });

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    return headers;
  }

  private async parseJson(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return undefined;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private unwrapData<T>(payload: unknown, requestId: string): T {
    if (!this.isRecord(payload) || !('data' in payload)) {
      throw new ReepayClientException({
        code: 'REEPAY_INVALID_RESPONSE',
        message: 'Reepay returned an unexpected success response',
        requestId,
      });
    }

    return (payload as ReepaySuccessResponse<T>).data;
  }

  private toReepayException(
    status: number,
    requestId: string,
    payload: unknown,
  ): ReepayClientException {
    const errorPayload = this.isRecord(payload) ? (payload as ReepayErrorResponse) : undefined;
    const reepayError = errorPayload?.error;

    return new ReepayClientException(
      {
        code: reepayError?.code ?? `REEPAY_HTTP_${status}`,
        message: reepayError?.message ?? 'Reepay request failed',
        details: reepayError?.details,
        requestId,
        reepayRequestId: reepayError?.requestId,
      },
      status >= 500 ? 502 : status,
    );
  }

  private toTimeoutException(
    path: string,
    requestId: string | undefined,
    error: unknown,
  ): ReepayClientException {
    const isAbort = error instanceof Error && error.name === 'AbortError';

    return new ReepayClientException({
      code: isAbort ? 'REEPAY_TIMEOUT' : 'REEPAY_NETWORK_ERROR',
      message: isAbort ? 'Reepay request timed out' : 'Unable to reach Reepay',
      details: {
        path,
      },
      requestId,
    });
  }

  private extractReepayRequestId(payload: unknown): string | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    const successPayload = payload as ReepaySuccessResponse<unknown>;
    const errorPayload = payload as ReepayErrorResponse;

    return successPayload.meta?.requestId ?? errorPayload.error?.requestId;
  }

  private logRequest(event: {
    method: HttpMethod;
    path: string;
    statusCode?: number;
    requestId: string;
    reepayRequestId?: string;
    attempt: number;
    startedAt: bigint;
    errorMessage?: string;
  }): void {
    const durationMs = Number(process.hrtime.bigint() - event.startedAt) / 1_000_000;

    this.logger.log(
      JSON.stringify({
        method: event.method,
        path: event.path,
        statusCode: event.statusCode,
        requestId: event.requestId,
        reepayRequestId: event.reepayRequestId,
        attempt: event.attempt,
        durationMs: Math.round(durationMs),
        errorMessage: event.errorMessage,
      }),
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
