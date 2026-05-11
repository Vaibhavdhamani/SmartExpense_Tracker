import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useRecurring() {
  const { toast } = useToast();
  const [items,      setItems]      = useState([]);
  const [dueItems,   setDueItems]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const BASE_URL = process.env.REACT_APP_API_URL;

  // ── Raw fetch — bypass axios to avoid any serialization issues ──────────────
  const getToken = () => localStorage.getItem('ef_token');

  const apiFetch = async (method, path, body) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
    };
    if (body) {
      // Manually build clean object — strip any accidental double-encoding
      const clean = {};
      Object.entries(body).forEach(([k, v]) => {
        if (typeof v === 'string') {
          // Remove any surrounding quotes that may have crept in
          clean[k] = v.replace(/^"+|"+$/g, '').trim();
        } else {
          clean[k] = v;
        }
      });
      opts.body = JSON.stringify(clean);
    }
    const res  = await fetch(`${BASE_URL}/api${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  // ── Fetch all recurring + due ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, dueRes] = await Promise.all([
        apiFetch('GET', '/recurring'),
        apiFetch('GET', '/recurring/due'),
      ]);
      setItems(allRes.data    || []);
      setDueItems(dueRes.data || []);
    } catch (err) {
      toast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const addRecurring = async (payload) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', '/recurring', payload);
      toast('Recurring expense created successfully!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to create recurring expense', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  // ── Update ───────────────────────────────────────────────────────────────────
  const updateRecurring = async (id, payload) => {
    setSubmitting(true);
    try {
      await apiFetch('PUT', `/recurring/${id}`, payload);
      toast('Updated successfully!', 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to update recurring expense', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteRecurring = async (id) => {
    try {
      await apiFetch('DELETE', `/recurring/${id}`);
      toast('Deleted successfully', 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to delete recurring expense', 'error');
    }
  };

  // ── Confirm due ──────────────────────────────────────────────────────────────
  const confirmDue = async (id, name) => {
    setSubmitting(true);
    try {
      await apiFetch('POST', `/recurring/${id}/confirm`);
      toast(`✅ "${name}" expense added successfully!`, 'success');
      await fetchAll();
      return true;
    } catch (err) {
      toast(err.message || 'Failed to confirm due expense', 'error');
      return false;
    } finally { setSubmitting(false); }
  };

  // ── Skip ─────────────────────────────────────────────────────────────────────
  const skipDue = async (id, name) => {
    try {
      await apiFetch('POST', `/recurring/${id}/skip`);
      toast(`"${name}" skipped successfully`, 'info');
      await fetchAll();
    } catch (err) {
      toast(err.message || 'Failed to skip due expense', 'error');
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────────
  const toggleActive = async (item) => {
    await updateRecurring(item._id, { isActive: !item.isActive });
  };

  return {
    items, dueItems, loading, submitting,
    refetch: fetchAll,
    addRecurring, updateRecurring, deleteRecurring,
    confirmDue, skipDue, toggleActive,
  };
}