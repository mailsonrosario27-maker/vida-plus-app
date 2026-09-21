import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, registerUser, createWorkout } from './helpers';

// Testes de regressão para o incidente de segurança corrigido antes desta
// suíte existir: qualquer usuário autenticado conseguia pausar/encerrar o
// jejum ou completar o treino de OUTRO usuário só sabendo o id da sessão
// (IDOR — Insecure Direct Object Reference). Ver README "Revisão de
// segurança e robustez". Estes testes existem pra nunca mais regredir.
describe('Segurança — IDOR (jejum e treino)', () => {
  beforeAll(resetDb);

  describe('Jejum', () => {
    it('usuário B não consegue pausar o jejum do usuário A', async () => {
      const a = await registerUser();
      const b = await registerUser();

      const start = await api.post('/api/v1/fasting/start').set('Authorization', `Bearer ${a.accessToken}`).send({});
      const sessionId = start.body.id;

      const attack = await api.post(`/api/v1/fasting/${sessionId}/pause`).set('Authorization', `Bearer ${b.accessToken}`);
      expect(attack.status).toBe(404);

      // Confirma que o estado real não mudou — não é só o response code.
      const active = await api.get('/api/v1/fasting/active').set('Authorization', `Bearer ${a.accessToken}`);
      expect(active.body.status).toBe('ACTIVE');
    });

    it('usuário B não consegue encerrar o jejum do usuário A nem ganhar os pontos dele', async () => {
      const a = await registerUser();
      const b = await registerUser();

      const start = await api.post('/api/v1/fasting/start').set('Authorization', `Bearer ${a.accessToken}`).send({});
      const sessionId = start.body.id;

      const attack = await api.post(`/api/v1/fasting/${sessionId}/end`).set('Authorization', `Bearer ${b.accessToken}`);
      expect(attack.status).toBe(404);

      const bAchievements = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${b.accessToken}`);
      expect(bAchievements.body.totalPoints).toBe(0);

      const active = await api.get('/api/v1/fasting/active').set('Authorization', `Bearer ${a.accessToken}`);
      expect(active.body.status).toBe('ACTIVE');
    });

    it('usuário B não consegue cancelar o jejum do usuário A', async () => {
      const a = await registerUser();
      const b = await registerUser();
      const start = await api.post('/api/v1/fasting/start').set('Authorization', `Bearer ${a.accessToken}`).send({});

      const attack = await api.post(`/api/v1/fasting/${start.body.id}/cancel`).set('Authorization', `Bearer ${b.accessToken}`);
      expect(attack.status).toBe(404);
    });

    it('chamar /end duas vezes na mesma sessão não reaplica pontos (farming)', async () => {
      const a = await registerUser();
      const start = await api.post('/api/v1/fasting/start').set('Authorization', `Bearer ${a.accessToken}`).send({});

      const firstEnd = await api.post(`/api/v1/fasting/${start.body.id}/end`).set('Authorization', `Bearer ${a.accessToken}`);
      expect(firstEnd.status).toBe(200);

      const afterFirst = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${a.accessToken}`);
      const pointsAfterFirst = afterFirst.body.totalPoints;
      expect(pointsAfterFirst).toBeGreaterThan(0);

      const secondEnd = await api.post(`/api/v1/fasting/${start.body.id}/end`).set('Authorization', `Bearer ${a.accessToken}`);
      expect(secondEnd.status).toBe(404);

      const afterSecond = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${a.accessToken}`);
      expect(afterSecond.body.totalPoints).toBe(pointsAfterFirst);
    });
  });

  describe('Treino', () => {
    it('usuário B não consegue completar a sessão de treino do usuário A nem ganhar os pontos dele', async () => {
      const workout = await createWorkout();
      const a = await registerUser();
      const b = await registerUser();

      const start = await api.post(`/api/v1/workouts/${workout.id}/start`).set('Authorization', `Bearer ${a.accessToken}`);
      const sessionId = start.body.id;

      const attack = await api
        .post(`/api/v1/workouts/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${b.accessToken}`)
        .send({ durationMin: 10 });
      expect(attack.status).toBe(404);

      const bAchievements = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${b.accessToken}`);
      expect(bAchievements.body.totalPoints).toBe(0);
    });

    it('usuário B não consegue cancelar a sessão de treino do usuário A', async () => {
      const workout = await createWorkout();
      const a = await registerUser();
      const b = await registerUser();

      const start = await api.post(`/api/v1/workouts/${workout.id}/start`).set('Authorization', `Bearer ${a.accessToken}`);

      const attack = await api
        .post(`/api/v1/workouts/sessions/${start.body.id}/cancel`)
        .set('Authorization', `Bearer ${b.accessToken}`);
      expect(attack.status).toBe(404);
    });

    it('completar a mesma sessão duas vezes não reaplica pontos (farming)', async () => {
      const workout = await createWorkout();
      const a = await registerUser();
      const start = await api.post(`/api/v1/workouts/${workout.id}/start`).set('Authorization', `Bearer ${a.accessToken}`);

      const firstComplete = await api
        .post(`/api/v1/workouts/sessions/${start.body.id}/complete`)
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ durationMin: 10 });
      expect(firstComplete.status).toBe(200);

      const afterFirst = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${a.accessToken}`);
      const pointsAfterFirst = afterFirst.body.totalPoints;

      const secondComplete = await api
        .post(`/api/v1/workouts/sessions/${start.body.id}/complete`)
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ durationMin: 10 });
      expect(secondComplete.status).toBe(404);

      const afterSecond = await api.get('/api/v1/achievements').set('Authorization', `Bearer ${a.accessToken}`);
      expect(afterSecond.body.totalPoints).toBe(pointsAfterFirst);
    });
  });

  describe('Água (regressão de escopo por dono, caso mais simples)', () => {
    it('usuário B não consegue apagar um registro de água do usuário A', async () => {
      const a = await registerUser();
      const b = await registerUser();

      const log = await api.post('/api/v1/water').set('Authorization', `Bearer ${a.accessToken}`).send({ amountMl: 250 });
      expect(log.status).toBe(201);

      const attack = await api.delete(`/api/v1/water/${log.body.log.id}`).set('Authorization', `Bearer ${b.accessToken}`);
      expect(attack.status).toBe(204); // deleteMany com where errado não acha nada, não é erro — mas...

      const todayA = await api.get('/api/v1/water/today').set('Authorization', `Bearer ${a.accessToken}`);
      expect(todayA.body.totalMl).toBe(250); // ...o registro de A continua intacto, é isso que importa.
    });
  });
});
