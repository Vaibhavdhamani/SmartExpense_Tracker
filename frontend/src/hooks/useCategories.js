import { useState, useEffect } from 'react';
import api from '../services/api';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/categories');
        setCategories(data.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return { categories, loading };
}
