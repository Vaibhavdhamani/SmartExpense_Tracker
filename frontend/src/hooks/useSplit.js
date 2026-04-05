import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useSplit() {
  const { toast } = useToast();
  const [splits,     setSplits]     = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    const res  = await fetch(`/api${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, sumRes] = await Promise.all([
        apiFetch('GET', '/splits'),
        apiFetch('GET', '/splits/summary'),
      ]);
      setSplits(sRes.data     || []);
      setSummary(sumRes.data  || null);
    } catch (err) {
      toast(err.message || 'Splits load nahi hue', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addSplit = async (payload) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', '/splits', payload);
      toast('Split expense create ho gaya! 🎉', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Create nahi hua', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const updateSplit = async (id, payload) => {
    setSubmitting(true);
    try {
      await apiFetch('PUT', `/splits/${id}`, payload);
      toast('Update ho gaya!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Update nahi hua', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  const deleteSplit = async (id) => {
    try {
      await apiFetch('DELETE', `/splits/${id}`);
      toast('Delete ho gaya', 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Delete nahi hua', 'error');
    }
  };

  const markPaid = async (splitId, participantId, name) => {
    try {
      await apiFetch('POST', `/splits/${splitId}/markpaid`, { participantId });
      toast(`${name} ne pay kar diya! ✅`, 'success');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Mark paid nahi hua', 'error');
    }
  };

  const unmarkPaid = async (splitId, participantId, name) => {
    try {
      await apiFetch('POST', `/splits/${splitId}/unmarkpaid`, { participantId });
      toast(`${name} ka payment undo kiya`, 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Undo nahi hua', 'error');
    }
  };

  const settleAll = async (splitId, title) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', `/splits/${splitId}/settle`);
      toast(`"${title}" fully settled! 🎉`, 'success');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Settle nahi hua', 'error');
    } finally { setSubmitting(false); }
  };

  return {
    splits, summary, loading, submitting,
    refetch: fetchAll,
    addSplit, updateSplit, deleteSplit,
    markPaid, unmarkPaid, settleAll,
  };
}