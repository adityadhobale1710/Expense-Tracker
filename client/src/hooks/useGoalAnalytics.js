import { useQuery } from '@tanstack/react-query';
import goalService from '../services/goalService';

export function useGoalAnalytics(goalId = null) {
  // 1. Single goal detail query (if goalId provided)
  const detailQuery = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalService.getGoalById(goalId),
    enabled: !!goalId
  });

  // 2. Goal specific AI Insights query (if goalId provided)
  const insightsQuery = useQuery({
    queryKey: ['goalInsights', goalId],
    queryFn: () => goalService.getGoalInsights(goalId),
    enabled: !!goalId,
    staleTime: 10 * 60 * 1000 // 10 minutes cache freshness
  });

  // 3. User-wide goal analytics query (fallback if no goalId is provided)
  const analyticsQuery = useQuery({
    queryKey: ['goalAnalytics', 'all'],
    queryFn: () => goalService.getGoalAnalytics(),
    enabled: !goalId
  });

  // 3b. Specific goal analytics query
  const specificAnalyticsQuery = useQuery({
    queryKey: ['goalAnalytics', goalId],
    queryFn: () => goalService.getSpecificGoalAnalytics(goalId),
    enabled: !!goalId
  });

  // 4. User-wide AI Recommendations query
  const recommendationsQuery = useQuery({
    queryKey: ['goalRecommendations'],
    queryFn: () => goalService.getGoalRecommendations()
  });

  return {
    goal: detailQuery.data || null,
    isLoadingGoal: detailQuery.isLoading,
    refetchGoal: detailQuery.refetch,

    insights: insightsQuery.data || [],
    isLoadingInsights: insightsQuery.isLoading,
    refetchInsights: insightsQuery.refetch,

    analytics: goalId ? (specificAnalyticsQuery.data || {}) : (analyticsQuery.data || {}),
    isLoadingAnalytics: goalId ? specificAnalyticsQuery.isLoading : analyticsQuery.isLoading,
    refetchAnalytics: goalId ? specificAnalyticsQuery.refetch : analyticsQuery.refetch,

    recommendations: recommendationsQuery.data || [],
    isLoadingRecommendations: recommendationsQuery.isLoading,
    refetchRecommendations: recommendationsQuery.refetch
  };
}

export function useGoalContributions(goalId, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['goalContributions', goalId, page, limit],
    queryFn: () => goalService.getGoalContributions(goalId, page, limit),
    enabled: !!goalId
  });
}

export default useGoalAnalytics;
