import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const resp = await axios.post('/api/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const newToken = resp.data.access_token;
          localStorage.setItem('access_token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed helpers
export const get = <T>(url: string, params?: object): Promise<AxiosResponse<T>> =>
  api.get(url, { params });

export const post = <T>(url: string, data?: object): Promise<AxiosResponse<T>> =>
  api.post(url, data);

export const put = <T>(url: string, data?: object): Promise<AxiosResponse<T>> =>
  api.put(url, data);

export const del = <T>(url: string): Promise<AxiosResponse<T>> =>
  api.delete(url);

export const upload = <T>(url: string, formData: FormData): Promise<AxiosResponse<T>> =>
  api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
