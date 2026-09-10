import { HttpException, HttpStatus } from '@nestjs/common';

export type NormalizedReepayError = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  reepayRequestId?: string;
};

export class ReepayClientException extends HttpException {
  constructor(error: NormalizedReepayError, status = HttpStatus.BAD_GATEWAY) {
    super(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: error.requestId,
          reepayRequestId: error.reepayRequestId,
        },
      },
      status,
    );
  }
}
