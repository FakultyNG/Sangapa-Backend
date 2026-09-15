import { join } from 'node:path';

import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import 'reflect-metadata';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('SANGAPAY_FRONTEND_URL');
  const paymentRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(helmet());
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use(
    [
      '/deposits/xaf',
      '/deposits/xaf/preview',
      '/wallet/eur/quote',
      '/wallet/eur/confirm',
      '/wallet/usdc/quote',
      '/wallet/usdc/confirm',
      '/fx/quote/xaf-eur',
      '/fx/quote/xaf-usdc',
      '/payouts/eur/recipient/validate',
      '/payouts/eur/iban/quote',
      '/payouts/eur/iban/confirm',
      '/payouts/eur/wisetag/quote',
      '/payouts/eur/wisetag/confirm',
      '/payouts/usdc/address/quote',
      '/payouts/usdc/address/confirm',
    ],
    paymentRateLimiter,
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
