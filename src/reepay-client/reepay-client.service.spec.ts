import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ReepayClientException } from './reepay-client.exception';
import { ReepayClientService } from './reepay-client.service';

describe('ReepayClientService', () => {
  let service: ReepayClientService;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;

    moduleRef = await Test.createTestingModule({
      providers: [
        ReepayClientService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                REEPAY_BASE_URL: 'https://reepay.example.test',
                SANGAPAY_REEPAY_API_KEY: 'secret-api-key',
                SANGAPAY_REEPAY_APPLICATION_ID: 'sangapay-backend',
              };

              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ReepayClientService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('injects required headers and unwraps success data', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { balance: '100.00' },
          meta: { requestId: 'reepay-request-id' },
        }),
        { status: 200 },
      ),
    );

    const result = await service.get<{ balance: string }>('/v1/wallet/balance', {
      query: { customerId: 'user-id' },
      requestId: 'request-id',
    });

    expect(result).toEqual({ balance: '100.00' });

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Headers;
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://reepay.example.test/v1/wallet/balance?customerId=user-id',
    );
    expect(init?.method).toBe('GET');
    expect(headers.get('X-Reepay-Api-Key')).toBe('secret-api-key');
    expect(headers.get('X-Reepay-Application-Id')).toBe('sangapay-backend');
    expect(headers.get('X-Request-Id')).toBe('request-id');
  });

  it('adds idempotency key for create or confirm requests', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'deposit-id' } }), { status: 201 }),
    );

    await service.post('/v1/deposits/xaf', {
      body: { amount: '10000' },
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
    });

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Headers;
    expect(headers.get('Idempotency-Key')).toBe('idem-key');
    expect(init?.body).toBe(JSON.stringify({ amount: '10000' }));
  });

  it('normalizes Reepay errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_CUSTOMER',
            message: 'Customer was not found',
            details: { customerId: 'user-id' },
            requestId: 'reepay-request-id',
          },
        }),
        { status: 404 },
      ),
    );

    let caught: unknown;
    try {
      await service.get('/v1/wallet/balance');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ReepayClientException);
    const response = (caught as ReepayClientException).getResponse();
    const normalized = response as {
      error: {
        code: string;
        message: string;
        details: unknown;
        requestId: string;
        reepayRequestId: string;
      };
    };

    expect(normalized.error.code).toBe('INVALID_CUSTOMER');
    expect(normalized.error.message).toBe('Customer was not found');
    expect(normalized.error.details).toEqual({ customerId: 'user-id' });
    expect(normalized.error.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(normalized.error.reepayRequestId).toBe('reepay-request-id');
  });

  it('retries network failures for safe GET requests only', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }));

    await expect(service.get('/v1/wallet/summary')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry POST network failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('temporary network error'));

    await expect(service.post('/v1/deposits/xaf', { body: { amount: '10000' } })).rejects.toThrow(
      ReepayClientException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
