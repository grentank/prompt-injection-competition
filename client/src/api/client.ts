import axios from 'axios';

const api = axios.create({ baseURL: '' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pic_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function instanceApi(instanceId: string) {
  return axios.create({
    baseURL: `/instance/${instanceId}/api`,
  });
}

export default api;
