import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RequestWithId } from '../common/types/request-with-id';
import { requiredEnvironmentKeys } from '../config/env.validation';

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  health(@Req() request: RequestWithId): Record<string, unknown> {
    return {
      status: 'ok',
      service: 'sangapay-backend',
      requestId: request.id,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  ready(@Req() request: RequestWithId): Record<string, unknown> {
    const missing = requiredEnvironmentKeys.filter((key) => !this.config.get<string>(key));
    const ready = missing.length === 0;

    return {
      status: ready ? 'ready' : 'not_ready',
      service: 'sangapay-backend',
      requestId: request.id,
      checks: {
        config: {
          ok: ready,
          missing,
        },
        reepay: {
          baseUrlConfigured: Boolean(this.config.get<string>('REEPAY_BASE_URL')),
          applicationId: this.config.get<string>('SANGAPAY_REEPAY_APPLICATION_ID'),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
