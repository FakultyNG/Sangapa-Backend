import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

import { RequestWithId } from '../types/request-with-id';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = this.getMessage(errorResponse, exception);
    const code = this.getCode(errorResponse, status);

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          requestId: request.id,
          method: request.method,
          path: request.originalUrl,
          statusCode: status,
          error: exception instanceof Error ? exception.message : String(exception),
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        details: this.getDetails(errorResponse),
        requestId: request.id,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      },
    });
  }

  private getMessage(errorResponse: unknown, exception: unknown): string {
    const nestedError = this.getNestedError(errorResponse);
    if (nestedError && typeof nestedError.message === 'string') {
      return nestedError.message;
    }

    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    if (this.isErrorObject(errorResponse) && typeof errorResponse.message === 'string') {
      return errorResponse.message;
    }

    if (this.isErrorObject(errorResponse) && Array.isArray(errorResponse.message)) {
      return errorResponse.message.join(', ');
    }

    return exception instanceof Error ? exception.message : 'Internal server error';
  }

  private getCode(errorResponse: unknown, status: number): string {
    const nestedError = this.getNestedError(errorResponse);
    if (nestedError && typeof nestedError.code === 'string') {
      return nestedError.code;
    }

    if (this.isErrorObject(errorResponse) && typeof errorResponse.error === 'string') {
      return errorResponse.error.toUpperCase().replaceAll(' ', '_');
    }

    return `HTTP_${status}`;
  }

  private getDetails(errorResponse: unknown): unknown {
    const nestedError = this.getNestedError(errorResponse);
    if (nestedError && 'details' in nestedError) {
      return nestedError.details;
    }

    if (this.isErrorObject(errorResponse) && Array.isArray(errorResponse.message)) {
      return errorResponse.message;
    }

    return undefined;
  }

  private isErrorObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getNestedError(errorResponse: unknown): Record<string, unknown> | undefined {
    if (!this.isErrorObject(errorResponse) || !this.isErrorObject(errorResponse.error)) {
      return undefined;
    }

    return errorResponse.error;
  }
}
