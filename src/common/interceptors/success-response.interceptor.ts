import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { RequestWithId } from '../types/request-with-id';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return next.handle().pipe(
      map((data: unknown) => ({
        data,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
