import { useQuery } from '@tanstack/react-query';
import goalService from '../services/goalService';

export function useGoalAnalytics(goalId = null) {
  // 1. Single goal detail query (if goalId provided)
  const detailQuery = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalService.getGoalById(goalId),
    enabled: !!goalId
  });

  // 2. User-wide goal analytics query (fallback if no goalId is provided)
  const analyticsQuery = useQuery({
    queryKey: ['goalAnalytics', 'all'],
    queryFn: () => goalService.getGoalAnalytics(),
    enabled: !goalId
  });

  // 3. Specific goal analytics query
  const specificAnalyticsQuery = useQuery({
    queryKey: ['goalAnalytics', goalId],
    queryFn: () => goalService.getSpecificGoalAnalytics(goalId),
    enabled: !!goalId
  });

  return {
    goal: detailQuery.data || null,
    isLoadingGoal: detailQuery.isLoading,
    refetchGoal: detailQuery.refetch,

    analytics: goalId ? (specificAnalyticsQuery.data || {}) : (analyticsQuery.data || {}),
    isLoadingAnalytics: goalId ? specificAnalyticsQuery.isLoading : analyticsQuery.isLoading,
    refetchAnalytics: goalId ? specificAnalyticsQuery.refetch : analyticsQuery.refetch
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
