type Environment = Record<string, string | undefined>;

const requiredKeys = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SANGAPAY_FRONTEND_URL',
  'REEPAY_BASE_URL',
  'SANGAPAY_REEPAY_API_KEY',
  'SANGAPAY_REEPAY_APPLICATION_ID',
  'REEPAY_WEBHOOK_SECRET',
] as const;

export function validateEnvironment(config: Environment): Record<string, string | number> {
  const nodeEnv = config.NODE_ENV ?? 'development';
  const port = Number(config.PORT ?? 3000);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const missing = requiredKeys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    ...config,
    PORT: port,
    NODE_ENV: nodeEnv,
  };
}

export const requiredEnvironmentKeys = requiredKeys;
