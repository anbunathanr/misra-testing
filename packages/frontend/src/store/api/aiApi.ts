import { api } from '../api';

export interface AIUsageStats {
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
  breakdown: {
    byUser: Record<string, number>;
    byProject: Record<string, number>;
    byDate: Record<string, number>;
  };
}

export interface AIUsageResponse {
  today: {
    requests: number;
    tokens: number;
    cost: number;
  };
  thisMonth: {
    requests: number;
    tokens: number;
    cost: number;
  };
  limits: {
    dailyRequests: number;
    dailyTokens: number;
    dailyCost: number;
    monthlyRequests: number;
    monthlyTokens: number;
    monthlyCost: number;
  };
  stats: AIUsageStats;
}

export const aiApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsage: builder.query<AIUsageResponse, void>({
      query: () => '/ai-test-generation/usage',
    }),
  }),
});

export const { useGetUsageQuery } = aiApi;
