import dotenv from 'dotenv';
import { validateServerEnv, type ServerEnv } from '@aadan-pradan/config';

// Load .env file from server root or process cwd
dotenv.config();

/**
 * Validated server environment configuration singleton
 */
export const env: ServerEnv = validateServerEnv(process.env);
