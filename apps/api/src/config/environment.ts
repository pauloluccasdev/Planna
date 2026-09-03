const DEFAULT_API_PORT = 3001;
const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

import 'dotenv/config';

export function getRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getApiPort(): number {
  const rawPort = process.env.PORT?.trim();

  if (!rawPort) return DEFAULT_API_PORT;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function getDatabasePoolMax(): number {
  const value = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error('DATABASE_POOL_MAX must be an integer between 1 and 20');
  }
  return value;
}

export function getWebOrigins(): string[] {
  return (process.env.WEB_ORIGIN?.trim() ?? DEFAULT_WEB_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
