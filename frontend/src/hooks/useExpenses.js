import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useExpenses(days = 30) {
  const { toast } = useToast();
  const [expenses, setExpenses]   = useState([]);
  const [summary,  setSummary]    = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        api.get(`/expenses?days=${days}`),
        api.get(`/expenses/summary?days=${days}`)
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(sumRes.data.data || null);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to load expenses', 'error');
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/expenses', payload);
      toast('Expense added successfully!');
      fetchExpenses();
      return data;
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add expense', 'error');
      return null;
    } finally { setSubmitting(false); }
  };

  const deleteExpense = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast('Expense deleted', 'info');
      fetchExpenses();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const updateExpense = async (id, payload) => {
    try {
      const { data } = await api.put(`/expenses/${id}`, payload);
      toast('Expense updated!');
      fetchExpenses();
      return data;
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update', 'error');
      return null;
    }
  };

  return { expenses, summary, loading, submitting, refetch: fetchExpenses, addExpense, deleteExpense, updateExpense };
}
