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
      toast(err.message || 'Goals load nahi hue', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addGoal = async (payload) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', '/goals', payload);
      toast('Goal set ho gaya! 🎯', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Goal add nahi hua', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const updateGoal = async (id, payload) => {
    setSubmitting(true);
    try {
      await apiFetch('PUT', `/goals/${id}`, payload);
      toast('Goal update ho gaya!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Update nahi hua', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const deleteGoal = async (id) => {
    try {
      await apiFetch('DELETE', `/goals/${id}`);
      toast('Goal delete ho gaya', 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Delete nahi hua', 'error');
    }
  };

  const deposit = async (id, amount, title) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('POST', `/goals/${id}/deposit`, { amount: Number(amount) });
      if (res.data.isCompleted) {
        toast(`🎉 "${title}" goal complete ho gaya!`, 'success');
      } else {
        toast(`₹${Number(amount).toLocaleString('en-IN')} add ho gaya!`, 'success');
      }
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Deposit nahi hua', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const withdraw = async (id, amount) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', `/goals/${id}/withdraw`, { amount: Number(amount) });
      toast(`₹${Number(amount).toLocaleString('en-IN')} withdraw ho gaya`, 'info');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Withdraw nahi hua', 'error');
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