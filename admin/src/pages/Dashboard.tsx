import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

interface Metrics {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  conversionPercent: number;
  activeUsers30d: number;
  retentionPercent: number;
  recipesCount: number;
  workoutsCount: number;
  mostFavoritedContent: { id: string; title: string; _count: { favoritedBy: number } }[];
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/metrics')
      .then((res) => setMetrics(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!metrics) return <p>Carregando métricas...</p>;

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="grid">
        <div className="card">
          <div className="metric-value">{metrics.totalUsers}</div>
          <div className="metric-label">Usuários cadastrados</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.activeUsers30d}</div>
          <div className="metric-label">Usuários ativos (30 dias)</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.premiumUsers}</div>
          <div className="metric-label">Assinantes Premium</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.conversionPercent}%</div>
          <div className="metric-label">Conversão Free → Premium</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.retentionPercent}%</div>
          <div className="metric-label">Retenção 30 dias</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.recipesCount}</div>
          <div className="metric-label">Receitas publicadas</div>
        </div>
        <div className="card">
          <div className="metric-value">{metrics.workoutsCount}</div>
          <div className="metric-label">Treinos publicados</div>
        </div>
      </div>

      <div className="section">
        <h3>Conteúdos mais favoritados</h3>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Receita</th>
                <th>Favoritos</th>
              </tr>
            </thead>
            <tbody>
              {metrics.mostFavoritedContent.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ color: 'var(--text-muted)' }}>Ainda sem dados suficientes.</td>
                </tr>
              ) : (
                metrics.mostFavoritedContent.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r._count.favoritedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
