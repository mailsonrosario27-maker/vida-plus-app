import axios from 'axios';

export const api = axios.create({ baseURL: 'http://localhost:4000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vidaplus_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada/revogada em qualquer chamada derruba o admin de volta para o
// login, em vez de deixar as páginas travadas silenciosamente esperando dados
// que nunca chegam.
export const UNAUTHORIZED_EVENT = 'vidaplus-admin-unauthorized';
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      localStorage.removeItem('vidaplus_admin_token');
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || 'Algo deu errado.';
  }
  return 'Algo deu errado.';
}
