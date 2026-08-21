import type { HealthCheckResponse } from '@aadan-pradan/types';
import { SERVICE_NAME, APP_VERSION } from '@aadan-pradan/config';
import { env } from '../config/env';
import { checkDatabaseConnection } from '../repositories/prisma';

export class HealthService {
  private startTime: number = Date.now();

  async getHealth(): Promise<HealthCheckResponse> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    
    let dbStatus: 'connected' | 'disconnected' | 'unconfigured' = 'unconfigured';
    if (env.DATABASE_URL) {
      const dbCheck = await checkDatabaseConnection();
      dbStatus = dbCheck.connected ? 'connected' : 'disconnected';
    }

    const isHealthy = dbStatus === 'connected' || dbStatus === 'unconfigured';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: env.NODE_ENV,
      database: {
        status: dbStatus,
      },
    };
  }

  async getReadiness(): Promise<{ ready: boolean; status: string; database: string; timestamp: string }> {
    const dbCheck = await checkDatabaseConnection();
    const ready = dbCheck.connected;

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      database: ready ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
