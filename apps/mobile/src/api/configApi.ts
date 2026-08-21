import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse, AppPublicConfig } from '@aadan-pradan/types';

export async function fetchConfig(): Promise<AppPublicConfig> {
  const response = await apiClient.get<ApiResponse<AppPublicConfig>>('/config');
  if (!response.data.data) {
    throw new Error('Invalid configuration response from server');
  }
  return response.data.data;
}

export function useAppConfig() {
  return useQuery({
    queryKey: ['server-config'],
    queryFn: fetchConfig,
    staleTime: Infinity,
  });
}
