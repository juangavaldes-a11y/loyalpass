import axios from 'axios';

export const portalApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error?.response?.data;
    const message = payload?.message || error.message || 'Request failed';

    return Promise.reject({
      message,
      status: error?.response?.status || 500,
      details: payload || null,
    });
  }
);
