import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BotStats, Module, ActivityItem, LeaderboardEntry, ApiResponse } from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.stats || data.data || data;
}

async function postApi<T>(endpoint: string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchApi<BotStats>('/stats'),
    refetchInterval: 5000,
  });
}

export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: () => fetchApi<Record<string, boolean>>('/modules'),
    refetchInterval: 10000,
  });
}

export function useActivity(limit: number = 50) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => fetchApi<ActivityItem[]>(`/activity?limit=${limit}`),
    refetchInterval: 10000,
  });
}

export function useLeaderboard(limit: number = 15) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchApi<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`),
    refetchInterval: 15000,
  });
}

export function useToggleModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ module, enabled }: { module: string; enabled: boolean }) =>
      postApi('/toggle-module', { module, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}

export function useBotControl() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (action: 'restart' | 'pause' | 'resume' | 'shutdown') =>
      postApi(`/control/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
