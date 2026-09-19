import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Auto-retry once for network disconnects or 502/503 temporary blips
    if (
      originalRequest &&
      !originalRequest._retry &&
      (!error.response || error.response.status === 502 || error.response.status === 503)
    ) {
      originalRequest._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
