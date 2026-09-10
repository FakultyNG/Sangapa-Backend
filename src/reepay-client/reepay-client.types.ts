export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ReepayRequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  requestId?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
};

export type ReepaySuccessResponse<T> = {
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
};

export type ReepayErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
  meta?: {
    timestamp?: string;
    path?: string;
  };
};
