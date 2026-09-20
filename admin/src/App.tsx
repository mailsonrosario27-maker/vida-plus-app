import React, { useEffect, useState } from 'react';
import { api, errorMessage, UNAUTHORIZED_EVENT, storeTokens, clearTokens, hasStoredSession, getStoredRefreshToken } from './api';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Recipes } from './pages/Recipes';
import { Workouts } from './pages/Workouts';
import { Content } from './pages/Content';

type Page = 'dashboard' | 'users' | 'recipes' | 'workouts' | 'content';

function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('admin@vidaplus.app');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.user.role !== 'ADMIN') {
        setError('Esta conta não tem acesso ao painel administrativo.');
        return;
      }
      storeTokens(res.data.accessToken, res.data.refreshToken);
      onLoggedIn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1 style={{ color: 'var(--primary-dark)', marginBottom: 4 }}>VIDA+ Admin</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Painel administrativo interno
        </p>
        <label>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <label>Senha</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const NAV: { key: Page; label: string }[] = [
  { key: 'dashboard', label: '📊 Dashboard' },
  { key: 'users', label: '👥 Usuários' },
  { key: 'recipes', label: '🥗 Receitas' },
  { key: 'workouts', label: '🏃 Treinos' },
  { key: 'content', label: '📣 Banners & Notificações' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => hasStoredSession());
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const handler = () => setLoggedIn(false);
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    // Aquecimento inicial — se o token já estiver inválido, o interceptor global
    // de api.ts cuida de derrubar a sessão via UNAUTHORIZED_EVENT.
    api.get('/admin/metrics').catch(() => {});
  }, [loggedIn]);

  if (!loggedIn) {
    return <Login onLoggedIn={() => setLoggedIn(true)} />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>🌿 VIDA+</h1>
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            {item.label}
          </button>
        ))}
        <button
          className="nav-item"
          style={{ marginTop: 24, color: 'var(--danger)' }}
          onClick={() => {
            const refreshToken = getStoredRefreshToken();
            if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
            clearTokens();
            setLoggedIn(false);
          }}
        >
          Sair
        </button>
      </aside>
      <main className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'users' && <Users />}
        {page === 'recipes' && <Recipes />}
        {page === 'workouts' && <Workouts />}
        {page === 'content' && <Content />}
      </main>
    </div>
  );
}
