import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateXafDepositDto } from '../deposits/dto/create-xaf-deposit.dto';

describe('API contract hardening', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateXafDepositDto,
  };

  it('rejects frontend-supplied customerId on money movement DTOs', async () => {
    let caught: unknown;

    try {
      await pipe.transform(
        {
          customerId: 'other-user-id',
          amount: '10000',
          network: 'MTN_CM',
          phoneNumber: '237670000000',
          pin: '1234',
        },
        metadata,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = (caught as BadRequestException).getResponse() as {
      message: string[];
    };
    expect(response.message).toContain('property customerId should not exist');
  });
});
