import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incomingRequestId = req.header('x-request-id');
    const requestId =
      incomingRequestId && incomingRequestId.trim() ? incomingRequestId : randomUUID();

    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
