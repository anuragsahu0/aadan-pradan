export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    service?: string;
    version?: string;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'unconfigured';
  };
}

export interface AppPublicConfig {
  maxUsersPerFrequency: number;
  defaultFrequency: string;
  features: {
    voiceEnabled: boolean;
    authRequired: boolean;
    maxFrequenciesPerUser: number;
  };
  version: string;
  environment: string;
}
