import type { AppPublicConfig } from '@aadan-pradan/types';
import { APP_VERSION } from '@aadan-pradan/config';
import { env } from '../config/env';

export class ConfigService {
  getPublicConfig(): AppPublicConfig {
    return {
      maxUsersPerFrequency: env.MAX_USERS_PER_FREQUENCY,
      defaultFrequency: env.DEFAULT_FREQUENCY,
      features: {
        voiceEnabled: false, // Strictly false in Phase 1
        authRequired: false,
        maxFrequenciesPerUser: 1,
      },
      version: APP_VERSION,
      environment: env.NODE_ENV,
    };
  }
}

export const configService = new ConfigService();
