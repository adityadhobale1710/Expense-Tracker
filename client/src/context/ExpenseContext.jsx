import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Incomes ──────────────────────────────────────────
  const fetchIncomes = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/income', { params });
      setIncomes(data.data.incomes || []);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to fetch incomes'); }
    finally { setLoading(false); }
  }, []);

  const addIncome = async (payload) => {
    const { data } = await api.post('/income', payload);
    setIncomes((prev) => [data.data, ...prev]);
    toast.success('Income added!');
    return data.data;
  };

  const updateIncome = async (id, payload) => {
    const { data } = await api.put(`/income/${id}`, payload);
    setIncomes((prev) => prev.map((i) => (i._id === id ? data.data : i)));
    toast.success('Income updated!');
  };

  const deleteIncome = async (id) => {
    await api.delete(`/income/${id}`);
    setIncomes((prev) => prev.filter((i) => i._id !== id));
    toast.success('Income deleted');
  };

  // ─── Expenses ─────────────────────────────────────────
  const fetchExpenses = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.data.expenses || []);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to fetch expenses'); }
    finally { setLoading(false); }
  }, []);

  const addExpense = async (payload) => {
    const { data } = await api.post('/expenses', payload);
    setExpenses((prev) => [data.data, ...prev]);
    toast.success('Expense added!');
    return data.data;
  };

  const updateExpense = async (id, payload) => {
    const { data } = await api.put(`/expenses/${id}`, payload);
    setExpenses((prev) => prev.map((e) => (e._id === id ? data.data : e)));
    toast.success('Expense updated!');
  };

  const deleteExpense = async (id) => {
    await api.delete(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e._id !== id));
    toast.success('Expense deleted');
  };

  // ─── Categories ───────────────────────────────────────
  const fetchCategories = useCallback(async (type) => {
    try {
      const { data } = await api.get('/categories', { params: type ? { type } : {} });
      setCategories(data.data || []);
    } catch {}
  }, []);

  // ─── Budgets ──────────────────────────────────────────
  const fetchBudgets = useCallback(async () => {
    try {
      const { data } = await api.get('/budgets');
      setBudgets(data.data || []);
    } catch {}
  }, []);

  const addBudget = async (payload) => {
    const { data } = await api.post('/budgets', payload);
    setBudgets((prev) => [...prev, data.data]);
    toast.success('Budget created!');
  };

  const updateBudget = async (id, payload) => {
    const { data } = await api.put(`/budgets/${id}`, payload);
    setBudgets((prev) => prev.map((b) => (b._id === id ? data.data : b)));
    toast.success('Budget updated!');
  };

  const deleteBudget = async (id) => {
    await api.delete(`/budgets/${id}`);
    setBudgets((prev) => prev.filter((b) => b._id !== id));
    toast.success('Budget deleted');
  };

  // ─── Summary ──────────────────────────────────────────
  const fetchSummary = useCallback(async (params = {}) => {
    try {
      const { data } = await api.get('/reports/summary', { params });
      setSummary(data.data);
    } catch {}
  }, []);

  return (
    <ExpenseContext.Provider value={{
      incomes, expenses, categories, budgets, summary, loading,
      fetchIncomes, addIncome, updateIncome, deleteIncome,
      fetchExpenses, addExpense, updateExpense, deleteExpense,
      fetchCategories, fetchBudgets, addBudget, updateBudget, deleteBudget,
      fetchSummary,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpense must be used within ExpenseProvider');
  return ctx;
};
