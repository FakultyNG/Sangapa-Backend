import { createHmac } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReepayWebhookService } from './reepay-webhook.service';

describe('ReepayWebhookService', () => {
  let service: ReepayWebhookService;
  let moduleRef: TestingModule;
  let prisma: {
    reepayWebhookEvent: {
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    notification: {
      create: jest.Mock;
    };
  };
  let notifications: {
    createForUser: jest.Mock<Promise<Record<string, unknown>>, [Record<string, unknown>]>;
  };

  beforeEach(async () => {
    prisma = {
      reepayWebhookEvent: {
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };
    notifications = {
      createForUser: jest.fn<Promise<Record<string, unknown>>, [Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        ReepayWebhookService,
        {
          provide: ConfigService,
          useValue: {
            get: () => 'webhook-secret',
            getOrThrow: () => 'webhook-secret',
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    service = moduleRef.get(ReepayWebhookService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('persists and processes a valid webhook event', async () => {
    const payload = { customerId: 'user-id', depositId: 'deposit-id' };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = sign(rawBody);
    prisma.reepayWebhookEvent.create.mockResolvedValueOnce({ id: 'event-row-id' });
    notifications.createForUser.mockResolvedValueOnce({ id: 'notification-id' });
    prisma.reepayWebhookEvent.update.mockResolvedValueOnce({ id: 'event-row-id' });

    await expect(
      service.handle(
        {
          signature,
          eventType: 'deposit.completed',
          eventId: 'event-id',
          timestamp: new Date().toISOString(),
          requestId: 'request-id',
        },
        rawBody,
        payload,
      ),
    ).resolves.toEqual({ received: true, duplicate: false });

    expect(prisma.reepayWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        eventId: 'event-id',
        eventType: 'deposit.completed',
        payload,
        signatureValid: true,
        processingStatus: 'RECEIVED',
      },
    });
    expect(notifications.createForUser).toHaveBeenCalledWith({
      userId: 'user-id',
      type: 'deposit.completed',
      title: 'Reepay deposit.completed',
      body: 'Your deposit completed update is available.',
      payload,
    });
    const updateCall = prisma.reepayWebhookEvent.update.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateCall.where).toEqual({ eventId: 'event-id' });
    expect(updateCall.data.processedAt).toBeInstanceOf(Date);
    expect(updateCall.data.processingStatus).toBe('PROCESSED');
  });

  it('returns duplicate without reprocessing an existing event id', async () => {
    const payload = { customerId: 'user-id' };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const error = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.reepayWebhookEvent.create.mockRejectedValueOnce(error);

    await expect(
      service.handle(
        {
          signature: sign(rawBody),
          eventType: 'deposit.completed',
          eventId: 'event-id',
          timestamp: new Date().toISOString(),
          requestId: 'request-id',
        },
        rawBody,
        payload,
      ),
    ).resolves.toEqual({ received: true, duplicate: true });

    expect(notifications.createForUser).not.toHaveBeenCalled();
    expect(prisma.reepayWebhookEvent.update).not.toHaveBeenCalled();
  });

  it('persists invalid signature events when identifiers are present', async () => {
    const payload = { customerId: 'user-id' };
    const rawBody = Buffer.from(JSON.stringify(payload));

    await expect(
      service.handle(
        {
          signature: '00',
          eventType: 'deposit.failed',
          eventId: 'event-id',
          timestamp: new Date().toISOString(),
          requestId: 'request-id',
        },
        rawBody,
        payload,
      ),
    ).rejects.toThrow(UnauthorizedException);

    const upsertCall = prisma.reepayWebhookEvent.upsert.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(upsertCall.where).toEqual({ eventId: 'event-id' });
    expect(upsertCall.create.eventId).toBe('event-id');
    expect(upsertCall.create.eventType).toBe('deposit.failed');
    expect(upsertCall.create.payload).toEqual(payload);
    expect(upsertCall.create.signatureValid).toBe(false);
    expect(upsertCall.create.processedAt).toBeInstanceOf(Date);
    expect(upsertCall.create.processingStatus).toBe('FAILED');
    expect(upsertCall.create.errorMessage).toBe('Invalid Reepay webhook signature');
    expect(upsertCall.update).toEqual({});
  });
});

function sign(rawBody: Buffer): string {
  return createHmac('sha256', 'webhook-secret').update(rawBody).digest('hex');
}
