import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useGoals() {
  const { toast } = useToast();
  const [goals,     setGoals]     = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [submitting,setSubmitting]= useState(false);

  const getToken = () => localStorage.getItem('ef_token');
  const BASE_URL = process.env.REACT_APP_API_URL;

  const apiFetch = async (method, path, body) => {
    const opts = {
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(`${BASE_URL}/api${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([
        apiFetch('GET', '/goals'),
        apiFetch('GET', '/goals/summary'),
      ]);
      setGoals(gRes.data   || []);
      setSummary(sRes.data || null);
    } catch (err) {
      toast(err.message || 'Failed to load goals', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addGoal = async (payload) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', '/goals', payload);
      toast('Goal set successfully! 🎯', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to create goal', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const updateGoal = async (id, payload) => {
    setSubmitting(true);
    try {
      await apiFetch('PUT', `/goals/${id}`, payload);
      toast('Goal updated successfully!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to update goal', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const deleteGoal = async (id) => {
    try {
      await apiFetch('DELETE', `/goals/${id}`);
      toast('Goal deleted successfully', 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to delete goal', 'error');
    }
  };

  const deposit = async (id, amount, title) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('POST', `/goals/${id}/deposit`, { amount: Number(amount) });
      if (res.data.isCompleted) {
        toast(`🎉 "${title}" goal completed successfully!`, 'success');
      } else {
        toast(`₹${Number(amount).toLocaleString('en-IN')} added successfully!`, 'success');
      }
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to make deposit', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const withdraw = async (id, amount) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', `/goals/${id}/withdraw`, { amount: Number(amount) });
      toast(`₹${Number(amount).toLocaleString('en-IN')} withdrawn successfully`, 'info');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to withdraw amount', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  return {
    goals, summary, loading, submitting,
    refetch: fetchAll,
    addGoal, updateGoal, deleteGoal,
    deposit, withdraw,
  };
}