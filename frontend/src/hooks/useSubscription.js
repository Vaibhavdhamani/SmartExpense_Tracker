import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useSubscription() {
  const { toast }  = useToast();
  const [subs,     setSubs]     = useState([]);
  const [dueSubs,  setDueSubs]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const BASE_URL = process.env.REACT_APP_API_URL;

  const getToken = () => localStorage.getItem('ef_token');

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
      const [sRes, dRes, sumRes] = await Promise.all([
        apiFetch('GET', '/subscriptions'),
        apiFetch('GET', '/subscriptions/due?days=7'),
        apiFetch('GET', '/subscriptions/summary'),
      ]);
      setSubs(sRes.data       || []);
      setDueSubs(dRes.data    || []);
      setSummary(sumRes.data  || null);
    } catch (err) {
      toast(err.message || 'Failed to load subscriptions', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addSub = async (payload) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', '/subscriptions', payload);
      toast('Subscription created successfully! 📦', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to create subscription', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const updateSub = async (id, payload) => {
    setSubmitting(true);
    try {
      await apiFetch('PUT', `/subscriptions/${id}`, payload);
      toast('Subscription updated successfully!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to update subscription', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const renewSub = async (id, name) => {
    try {
      const res = await apiFetch('POST', `/subscriptions/${id}/renew`);
      toast(`${name} renewed! ✅`, 'success');
      await fetchAll();
      return res.data;
    } catch (err) {
      toast(err.message || 'Failed to renew subscription', 'error');
    }
  };

  const cancelSub = async (id, name) => {
    try {
      await apiFetch('POST', `/subscriptions/${id}/cancel`);
      toast(`${name} cancelled`, 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to cancel subscription', 'error');
    }
  };

  const deleteSub = async (id) => {
    try {
      await apiFetch('DELETE', `/subscriptions/${id}`);
      toast('Subscription deleted successfully', 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to delete subscription', 'error');
    }
  };

  const toggleActive = async (sub) => {
    await updateSub(sub._id, { isActive: !sub.isActive });
  };

  return {
    subs, dueSubs, summary, loading, submitting,
    refetch: fetchAll,
    addSub, updateSub, renewSub, cancelSub, deleteSub, toggleActive,
  };
}