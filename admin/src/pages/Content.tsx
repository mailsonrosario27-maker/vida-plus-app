import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  active: boolean;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
}

export function Content() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifAudience, setNotifAudience] = useState('all');

  const loadBanners = () =>
    api
      .get('/admin/banners')
      .then((res) => setBanners(res.data))
      .catch((err) => setError(errorMessage(err)));

  const loadNotifications = () =>
    api
      .get('/admin/notifications')
      .then((res) => setNotifications(res.data))
      .catch((err) => setError(errorMessage(err)));

  useEffect(() => {
    loadBanners();
    loadNotifications();
  }, []);

  const createBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/banners', { title: bannerTitle, subtitle: bannerSubtitle || undefined });
      setBannerTitle('');
      setBannerSubtitle('');
      loadBanners();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const removeBanner = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/admin/banners/${id}`);
      loadBanners();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggleBanner = async (id: string, active: boolean) => {
    setError(null);
    try {
      await api.patch(`/admin/banners/${id}`, { active });
      loadBanners();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const createNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/notifications', { title: notifTitle, body: notifBody, audience: notifAudience });
      setNotifTitle('');
      setNotifBody('');
      loadNotifications();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="page-title">Banners & Notificações</h2>

      {error && <div className="error-text">{error}</div>}

      <div className="section">
        <h3>Banners</h3>
        <form className="card" onSubmit={createBanner} style={{ marginBottom: 16 }}>
          <div className="row">
            <div>
              <label>Título</label>
              <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} required />
            </div>
            <div>
              <label>Subtítulo</label>
              <input value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} />
            </div>
          </div>
          <button className="btn" type="submit">Criar banner</button>
        </form>
        <div className="card">
          <table>
            <thead>
              <tr><th>Título</th><th>Subtítulo</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.subtitle || '—'}</td>
                  <td>{b.active ? 'Ativo' : 'Inativo'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn outline" onClick={() => toggleBanner(b.id, !b.active)}>
                      {b.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button className="btn danger" onClick={() => removeBanner(b.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h3>Notificações push</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: -8 }}>
          Em produção, isto dispara envio via Expo Push / FCM / APNs. Aqui fica registrado o histórico de
          campanhas enviadas.
        </p>
        <form className="card" onSubmit={createNotification} style={{ marginBottom: 16 }}>
          <label>Título</label>
          <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} required />
          <label>Mensagem</label>
          <input value={notifBody} onChange={(e) => setNotifBody(e.target.value)} required />
          <label>Audiência</label>
          <select value={notifAudience} onChange={(e) => setNotifAudience(e.target.value)}>
            <option value="all">Todos</option>
            <option value="premium">Somente Premium</option>
            <option value="free">Somente Gratuito</option>
          </select>
          <button className="btn" type="submit">Enviar notificação</button>
        </form>
        <div className="card">
          <table>
            <thead>
              <tr><th>Título</th><th>Mensagem</th><th>Audiência</th><th>Data</th></tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td>{n.title}</td>
                  <td>{n.body}</td>
                  <td>{n.audience}</td>
                  <td>{new Date(n.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
