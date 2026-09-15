import { createHmac, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReepayWebhookHeaders, ReepayWebhookResult } from './reepay-webhook.types';

@Injectable()
export class ReepayWebhookService {
  private readonly logger = new Logger(ReepayWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async handle(
    headers: ReepayWebhookHeaders,
    rawBody: Buffer,
    payload: unknown,
  ): Promise<ReepayWebhookResult> {
    this.assertRequiredHeaders(headers);

    const signatureValid = this.verifySignature(rawBody, headers.signature);
    if (!signatureValid) {
      await this.persistInvalidSignatureEvent(headers, payload);
      throw new UnauthorizedException('Invalid Reepay webhook signature');
    }

    try {
      await this.prisma.reepayWebhookEvent.create({
        data: {
          eventId: headers.eventId,
          eventType: headers.eventType,
          payload: this.toJson(payload),
          signatureValid: true,
          processingStatus: 'RECEIVED',
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return { received: true, duplicate: true };
      }

      throw error;
    }

    await this.processAcceptedEvent(headers, payload);
    return { received: true, duplicate: false };
  }

  private async processAcceptedEvent(
    headers: Required<ReepayWebhookHeaders>,
    payload: unknown,
  ): Promise<void> {
    try {
      const userId = this.extractCustomerId(payload);

      if (userId) {
        await this.notifications.createForUser({
          userId,
          type: headers.eventType,
          title: this.notificationTitle(headers.eventType),
          body: this.notificationBody(headers.eventType),
          payload: this.toJson(payload),
        });
      }

      await this.prisma.reepayWebhookEvent.update({
        where: {
          eventId: headers.eventId,
        },
        data: {
          processedAt: new Date(),
          processingStatus: 'PROCESSED',
        },
      });
    } catch (error) {
      await this.prisma.reepayWebhookEvent.update({
        where: {
          eventId: headers.eventId,
        },
        data: {
          processedAt: new Date(),
          processingStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      this.logger.error(
        JSON.stringify({
          message: 'Failed to process Reepay webhook event',
          eventId: headers.eventId,
          eventType: headers.eventType,
          requestId: headers.requestId,
        }),
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async persistInvalidSignatureEvent(
    headers: ReepayWebhookHeaders,
    payload: unknown,
  ): Promise<void> {
    if (!headers.eventId || !headers.eventType) {
      return;
    }

    try {
      await this.prisma.reepayWebhookEvent.upsert({
        where: {
          eventId: headers.eventId,
        },
        create: {
          eventId: headers.eventId,
          eventType: headers.eventType,
          payload: this.toJson(payload),
          signatureValid: false,
          processedAt: new Date(),
          processingStatus: 'FAILED',
          errorMessage: 'Invalid Reepay webhook signature',
        },
        update: {},
      });
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          message: 'Failed to persist invalid Reepay webhook signature event',
          eventId: headers.eventId,
          eventType: headers.eventType,
          errorMessage: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }

    const secret =
      this.config.get<string>('SANGAPAY_WEBHOOK_SECRET') ??
      this.config.getOrThrow<string>('REEPAY_WEBHOOK_SECRET');

    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    return (
      expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }

  private assertRequiredHeaders(
    headers: ReepayWebhookHeaders,
  ): asserts headers is Required<ReepayWebhookHeaders> {
    const missing = [
      ['X-Reepay-Signature', headers.signature],
      ['X-Reepay-Event', headers.eventType],
      ['X-Reepay-Event-Id', headers.eventId],
      ['X-Reepay-Timestamp', headers.timestamp],
      ['X-Request-Id', headers.requestId],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing Reepay webhook headers: ${missing.map(([name]) => name).join(', ')}`,
      );
    }
  }

  private extractCustomerId(payload: unknown): string | undefined {
    const direct = this.getStringProperty(payload, 'customerId');
    if (direct) {
      return direct;
    }

    const data = this.getRecordProperty(payload, 'data');
    return this.getStringProperty(data, 'customerId') ?? this.getStringProperty(data, 'userId');
  }

  private notificationTitle(eventType: string): string {
    return `Reepay ${eventType}`;
  }

  private notificationBody(eventType: string): string {
    return `Your ${eventType.replaceAll('.', ' ')} update is available.`;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private getRecordProperty(value: unknown, key: string): Record<string, unknown> | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const property = value[key];
    return this.isRecord(property) ? property : undefined;
  }

  private getStringProperty(value: unknown, key: string): string | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const property = value[key];
    return typeof property === 'string' && property.trim() ? property : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
