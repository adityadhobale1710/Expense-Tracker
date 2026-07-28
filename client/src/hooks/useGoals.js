import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import goalService from '../services/goalService';
import toast from 'react-hot-toast';

export function useGoals(filters = {}) {
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['goals', filters],
    queryFn: () => goalService.getGoals(filters)
  });

  const statsQuery = useQuery({
    queryKey: ['goalStats'],
    queryFn: () => goalService.getGoalStats()
  });

  const templatesQuery = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: () => goalService.getGoalTemplates()
  });

  const createMutation = useMutation({
    mutationFn: goalService.createGoal,
    onSuccess: () => {
      toast.success('Goal created successfully!');
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => goalService.updateGoal(id, data),
    onSuccess: (data, variables) => {
      toast.success('Goal updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => goalService.updateGoalStatus(id, status),
    onSuccess: (data, variables) => {
      toast.success(`Goal marked as ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: goalService.deleteGoal,
    onSuccess: () => {
      toast.success('Goal deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
    }
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, data }) => goalService.contributeToGoal(id, data),
    onMutate: async ({ id, data }) => {
      const amount = Number(data.amount);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['goal', id] });
      await queryClient.cancelQueries({ queryKey: ['goals'] });

      // Snapshot previous values
      const prevGoal = queryClient.getQueryData(['goal', id]);
      const prevGoals = queryClient.getQueryData(['goals', filters]);

      // Optimistically update goal details cache
      if (prevGoal) {
        queryClient.setQueryData(['goal', id], (old) => {
          const newSaved = Math.min(old.savedAmount + amount, old.targetAmount);
          const newRemaining = Math.max(0, old.targetAmount - newSaved);
          const newPct = Math.round((newSaved / old.targetAmount) * 100);
          return {
            ...old,
            savedAmount: newSaved,
            remainingAmount: newRemaining,
            progressPct: newPct,
            status: newPct >= 100 ? 'Completed' : old.status
          };
        });
      }

      // Optimistically update goals list cache
      if (prevGoals) {
        queryClient.setQueryData(['goals', filters], (old) => {
          return old.map((g) => {
            if (g._id === id) {
              const newSaved = Math.min(g.savedAmount + amount, g.targetAmount);
              const newRemaining = Math.max(0, g.targetAmount - newSaved);
              const newPct = Math.round((newSaved / g.targetAmount) * 100);
              return {
                ...g,
                savedAmount: newSaved,
                remainingAmount: newRemaining,
                progressPct: newPct,
                status: newPct >= 100 ? 'Completed' : g.status
              };
            }
            return g;
          });
        });
      }

      return { prevGoal, prevGoals };
    },
    onError: (err, variables, context) => {
      // Rollback to snapshots
      if (context?.prevGoal) {
        queryClient.setQueryData(['goal', variables.id], context.prevGoal);
      }
      if (context?.prevGoals) {
        queryClient.setQueryData(['goals', filters], context.prevGoals);
      }
      toast.error(err.response?.data?.message || 'Failed to add money');
    },
    onSuccess: (res) => {
      if (res.differenceReturned > 0) {
        toast.success(`Savings contribution logged. Goal Completed! ₹${res.differenceReturned.toLocaleString('en-IN')} returned to wallet.`);
      } else {
        toast.success('Savings contribution added successfully!');
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStats'] });
      queryClient.invalidateQueries({ queryKey: ['goalContributions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['goalAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['goalRecommendations'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] }); // Refresh wallets
    }
  });

  return {
    goals: goalsQuery.data || [],
    isLoadingGoals: goalsQuery.isLoading,
    goalsError: goalsQuery.error,
    refetchGoals: goalsQuery.refetch,

    stats: statsQuery.data || {},
    isLoadingStats: statsQuery.isLoading,
    refetchStats: statsQuery.refetch,

    templates: templatesQuery.data || [],
    isLoadingTemplates: templatesQuery.isLoading,

    createGoal: createMutation.mutateAsync,
    isCreatingGoal: createMutation.isPending,

    updateGoal: updateMutation.mutateAsync,
    isUpdatingGoal: updateMutation.isPending,

    updateGoalStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,

    deleteGoal: deleteMutation.mutateAsync,
    isDeletingGoal: deleteMutation.isPending,

    contributeToGoal: contributeMutation.mutateAsync,
    isContributing: contributeMutation.isPending,

    deleteContribution: async (id, contribId) => {
      return queryClient.executeMutation({
        mutationFn: () => goalService.deleteContribution(id, contribId),
        onSuccess: () => {
          toast.success('Contribution removed and balance refunded.');
          queryClient.invalidateQueries({ queryKey: ['goal', id] });
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          queryClient.invalidateQueries({ queryKey: ['goalStats'] });
          queryClient.invalidateQueries({ queryKey: ['goalContributions', id] });
          queryClient.invalidateQueries({ queryKey: ['goalAnalytics'] });
          queryClient.invalidateQueries({ queryKey: ['goalRecommendations'] });
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Failed to remove contribution');
        }
      });
    }
  };
}

export default useGoals;

