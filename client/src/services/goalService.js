import api from './api';

export const goalService = {
  getGoals: async (params) => {
    const { data } = await api.get('/goals', { params });
    return data.data;
  },

  getGoalStats: async () => {
    const { data } = await api.get('/goals/stats');
    return data.data;
  },

  getGoalTemplates: async () => {
    const { data } = await api.get('/goals/templates');
    return data.data;
  },

  getGoalById: async (id) => {
    const { data } = await api.get(`/goals/${id}`);
    return data.data;
  },

  getGoalContributions: async (id, page = 1, limit = 20) => {
    const { data } = await api.get(`/goals/${id}/contributions`, {
      params: { page, limit }
    });
    return data.data;
  },

  createGoal: async (goalData) => {
    const { data } = await api.post('/goals', goalData);
    return data.data;
  },

  updateGoal: async (id, goalData) => {
    const { data } = await api.put(`/goals/${id}`, goalData);
    return data.data;
  },

  updateGoalStatus: async (id, status) => {
    const { data } = await api.put(`/goals/${id}/status`, { status });
    return data.data;
  },

  deleteGoal: async (id) => {
    const { data } = await api.delete(`/goals/${id}`);
    return data.data;
  },

  contributeToGoal: async (id, contributionData) => {
    const { data } = await api.post(`/goals/${id}/contribute`, contributionData);
    return data.data;
  },

  getGoalInsights: async (id) => {
    const { data } = await api.get(`/goals/${id}/insights`);
    return data.data;
  },

  getGoalAnalytics: async () => {
    const { data } = await api.get('/goals/analytics');
    return data.data;
  },

  getSpecificGoalAnalytics: async (id) => {
    const { data } = await api.get(`/goals/${id}/analytics`);
    return data.data;
  },

  getGoalRecommendations: async () => {
    const { data } = await api.get('/goals/recommendations');
    return data.data;
  },

  deleteContribution: async (id, contribId) => {
    const { data } = await api.delete(`/goals/${id}/contributions/${contribId}`);
    return data.data;
  }
};

export default goalService;
