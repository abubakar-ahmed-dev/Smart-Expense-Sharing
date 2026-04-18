import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, '..', '..');
const workspaceRoot = path.resolve(backendRoot, '..');

// Load root and backend env files so `npm run dev` works from either directory.
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config({ path: path.join(backendRoot, '.env') });

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(4500),
  DATABASE_URL: z.string().url(),
  AUTH_TOKEN_SECRET: z.string().min(32).default('dev-auth-token-secret-change-me-please-32+'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
