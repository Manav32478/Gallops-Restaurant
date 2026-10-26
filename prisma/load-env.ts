/**
 * Loads .env / .env.local before any other module touches the database.
 *
 * Next.js does this automatically for the app (src/server.ts calls loadEnvConfig),
 * but standalone scripts started with `tsx` (seed, menu importer) do not go through
 * Next, so DATABASE_URL would be missing at PrismaClient construction time.
 *
 * ES modules evaluate imports in order, so this file MUST be the first import in
 * any standalone script:
 *
 *   import './load-env';
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
  info: () => {},
  error: console.error,
});
