import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useBudgets() {
  const { toast } = useToast();
  const [budgets,  setBudgets]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/budgets/status');
      setBudgets(data.data?.budgets || []);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to load budgets', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const addBudget = async (payload) => {
    setSubmitting(true);
    try {
      await api.post('/budgets', payload);
      toast('Budget created!');
      fetchBudgets();
      return true;
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create budget', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const updateBudget = async (id, payload) => {
    setSubmitting(true);
    try {
      await api.put(`/budgets/${id}`, payload);
      toast('Budget updated!');
      fetchBudgets();
      return true;
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update budget', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const deleteBudget = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      toast('Budget deleted', 'info');
      fetchBudgets();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete budget', 'error');
    }
  };

  return { budgets, loading, submitting, refetch: fetchBudgets, addBudget, updateBudget, deleteBudget };
}
