import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// Attach stored token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ef_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ef_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
