import { describe, it, expect, beforeAll, vi } from 'vitest';
import { api, resetDb, registerUser, uniqueEmail } from './helpers';

// Intercepta o "envio" do e-mail de reset pra capturar o token cru, que por
// desenho nunca é exposto em nenhuma resposta HTTP (só o hash fica em
// banco). Isso deixa testar o fluxo feliz completo de ponta a ponta, sem
// precisar de um provedor de e-mail de verdade.
const sendPasswordResetEmail = vi.fn(async () => {});
vi.mock('../src/lib/email', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args),
}));

describe('Autenticação', () => {
  beforeAll(resetDb);

  describe('POST /api/auth/register', () => {
    it('cria conta e retorna access + refresh token', async () => {
      const email = uniqueEmail();
      const res = await api.post('/api/auth/register').send({ email, password: 'senha123456', name: 'Fulana' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user.email).toBe(email);
    });

    it('rejeita e-mail duplicado', async () => {
      const email = uniqueEmail();
      await api.post('/api/auth/register').send({ email, password: 'senha123456', name: 'Fulana' });
      const res = await api.post('/api/auth/register').send({ email, password: 'outrasenha1', name: 'Fulana' });

      expect(res.status).toBe(409);
    });

    it('rejeita senha curta', async () => {
      const res = await api.post('/api/auth/register').send({ email: uniqueEmail(), password: '123', name: 'Fulana' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica com credenciais corretas', async () => {
      const user = await registerUser();
      const res = await api.post('/api/auth/login').send({ email: user.email, password: 'senha123456' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it('rejeita senha errada sem dizer se o e-mail existe', async () => {
      const user = await registerUser();
      const res = await api.post('/api/auth/login').send({ email: user.email, password: 'senhaErrada' });
      expect(res.status).toBe(401);
    });

    it('rejeita e-mail inexistente com a mesma mensagem genérica', async () => {
      const res = await api.post('/api/auth/login').send({ email: uniqueEmail(), password: 'qualquer1' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('E-mail ou senha incorretos.');
    });
  });

  describe('GET /api/auth/me', () => {
    it('retorna o perfil do usuário autenticado', async () => {
      const user = await registerUser();
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(user.email);
    });

    it('rejeita sem token', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejeita token malformado', async () => {
      const res = await api.get('/api/auth/me').set('Authorization', 'Bearer token-invalido');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('emite um novo par de tokens e rotaciona o refresh token', async () => {
      const user = await registerUser();
      const res = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).not.toBe(user.refreshToken);
    });

    it('bloqueia o reuso do refresh token depois de rotacionado', async () => {
      const user = await registerUser();
      await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });

      const reused = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(reused.status).toBe(401);
    });

    it('rejeita refresh token inventado', async () => {
      const res = await api.post('/api/auth/refresh').send({ refreshToken: 'a'.repeat(64) });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout + GET /api/auth/sessions', () => {
    it('lista a sessão criada no registro', async () => {
      const user = await registerUser();
      const res = await api.get('/api/auth/sessions').set('Authorization', `Bearer ${user.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('revoga a sessão — refresh deixa de funcionar depois do logout', async () => {
      const user = await registerUser();
      const logout = await api.post('/api/auth/logout').send({ refreshToken: user.refreshToken });
      expect(logout.status).toBe(204);

      const refresh = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(refresh.status).toBe(401);
    });
  });

  describe('Recuperação de senha', () => {
    it('fluxo completo: pedir reset, trocar senha, logar com a nova e não com a antiga', async () => {
      const oldPassword = 'senhaAntiga1';
      const newPassword = 'senhaNova2';
      const user = await registerUser({ password: oldPassword });

      sendPasswordResetEmail.mockClear();
      const forgot = await api.post('/api/auth/forgot-password').send({ email: user.email });
      expect(forgot.status).toBe(200);
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const rawToken = sendPasswordResetEmail.mock.calls[0][1] as string;
      expect(rawToken).toHaveLength(64);

      const reset = await api.post('/api/auth/reset-password').send({ token: rawToken, newPassword });
      expect(reset.status).toBe(200);

      // Token de reset é de uso único.
      const reused = await api.post('/api/auth/reset-password').send({ token: rawToken, newPassword: 'outraSenha3' });
      expect(reused.status).toBe(400);

      const oldLogin = await api.post('/api/auth/login').send({ email: user.email, password: oldPassword });
      expect(oldLogin.status).toBe(401);

      const newLogin = await api.post('/api/auth/login').send({ email: user.email, password: newPassword });
      expect(newLogin.status).toBe(200);
    });

    it('trocar a senha revoga as sessões existentes (logout em todos os aparelhos)', async () => {
      const oldPassword = 'senhaAntiga1';
      const user = await registerUser({ password: oldPassword });

      sendPasswordResetEmail.mockClear();
      await api.post('/api/auth/forgot-password').send({ email: user.email });
      const rawToken = sendPasswordResetEmail.mock.calls[0][1] as string;
      await api.post('/api/auth/reset-password').send({ token: rawToken, newPassword: 'senhaNova2' });

      const refreshAfterReset = await api.post('/api/auth/refresh').send({ refreshToken: user.refreshToken });
      expect(refreshAfterReset.status).toBe(401);
    });

    it('rejeita token de reset inventado', async () => {
      const wrongReset = await api.post('/api/auth/reset-password').send({ token: 'token-que-nao-existe', newPassword: 'novaSenha2' });
      expect(wrongReset.status).toBe(400);
    });

    it('responde com a mesma mensagem para e-mail existente e inexistente (sem enumeração)', async () => {
      const user = await registerUser();
      const existing = await api.post('/api/auth/forgot-password').send({ email: user.email });
      const missing = await api.post('/api/auth/forgot-password').send({ email: uniqueEmail() });

      expect(existing.status).toBe(200);
      expect(missing.status).toBe(200);
      expect(existing.body.message).toBe(missing.body.message);
    });
  });

  describe('DELETE /api/auth/me (LGPD)', () => {
    it('exige a senha correta antes de excluir', async () => {
      const user = await registerUser();
      const wrong = await api
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ password: 'senhaErrada' });
      expect(wrong.status).toBe(401);
    });

    it('exclui a conta e invalida a sessão', async () => {
      const password = 'senha123456';
      const user = await registerUser({ password });

      const del = await api.delete('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`).send({ password });
      expect(del.status).toBe(204);

      const login = await api.post('/api/auth/login').send({ email: user.email, password });
      expect(login.status).toBe(401);
    });
  });
});
