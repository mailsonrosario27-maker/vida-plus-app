import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

interface UserRow {
  id: string;
  email: string;
  name?: string;
  goal?: string;
  plan?: string;
  status?: string;
  createdAt: string;
}

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/admin/users')
      .then((res) => {
        setUsers(res.data);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="page-title">Usuários</h2>
      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Objetivo</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.goal || '—'}</td>
                  <td>
                    <span className={`badge ${u.plan === 'PREMIUM' ? 'premium' : 'free'}`}>{u.plan || 'FREE'}</span>
                  </td>
                  <td>{u.status || '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
