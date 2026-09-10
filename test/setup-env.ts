process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/sangapay';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.SANGAPAY_FRONTEND_URL ??= 'http://localhost:3001';
process.env.REEPAY_BASE_URL ??= 'https://reepay.fakultyng.online';
process.env.SANGAPAY_REEPAY_API_KEY ??= 'test-api-key';
process.env.SANGAPAY_REEPAY_APPLICATION_ID ??= 'sangapay-backend';
process.env.REEPAY_WEBHOOK_SECRET ??= 'test-webhook-secret';
