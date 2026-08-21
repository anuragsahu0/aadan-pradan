import { apiClient } from './client';
import type {
  ApiResponse,
  FrequencyStateResponse,
  JoinFrequencyResponse,
  LeaveFrequencyResponse,
  FrequencyUserSummary,
} from '@aadan-pradan/types';

/**
 * Fetch public details and occupancy for a virtual frequency
 */
export async function fetchFrequencyDetails(
  frequencyCode: string
): Promise<FrequencyStateResponse> {
  const res = await apiClient.get<ApiResponse<FrequencyStateResponse>>(
    `/frequencies/${frequencyCode}`
  );
  if (!res.data.data) {
    throw new Error('Failed to fetch virtual frequency information');
  }
  return res.data.data;
}

/**
 * Atomically join a virtual frequency
 */
export async function joinFrequencyApi(
  frequencyCode: string
): Promise<JoinFrequencyResponse> {
  const res = await apiClient.post<ApiResponse<JoinFrequencyResponse>>(
    `/frequencies/${frequencyCode}/join`
  );
  if (!res.data.data) {
    throw new Error('Failed to join virtual frequency');
  }
  return res.data.data;
}

/**
 * Leave a virtual frequency
 */
export async function leaveFrequencyApi(
  frequencyCode: string
): Promise<LeaveFrequencyResponse> {
  const res = await apiClient.post<ApiResponse<LeaveFrequencyResponse>>(
    `/frequencies/${frequencyCode}/leave`
  );
  if (!res.data.data) {
    throw new Error('Failed to leave virtual frequency');
  }
  return res.data.data;
}

/**
 * Fetch live active operator roster for a virtual frequency
 */
export async function fetchFrequencyUsers(
  frequencyCode: string
): Promise<FrequencyUserSummary[]> {
  const res = await apiClient.get<
    ApiResponse<{ frequencyCode: string; count: number; users: FrequencyUserSummary[] }>
  >(`/frequencies/${frequencyCode}/users`);
  return res.data.data?.users || [];
}

/**
 * Fetch current operator's recent frequencies
 */
export async function fetchRecentFrequencies(): Promise<string[]> {
  try {
    const res = await apiClient.get<ApiResponse<{ recent: string[] }>>(
      '/frequencies/user/recent'
    );
    return res.data.data?.recent || [];
  } catch {
    return [];
  }
}
