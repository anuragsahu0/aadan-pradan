import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse, HealthCheckResponse } from '@aadan-pradan/types';

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const response = await apiClient.get<ApiResponse<HealthCheckResponse>>('/health');
  if (!response.data.data) {
    throw new Error('Invalid health response from server');
  }
  return response.data.data;
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['server-health'],
    queryFn: fetchHealth,
    refetchInterval: 30000,
    retry: 2,
  });
}
