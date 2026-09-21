import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, registerUser, registerAdmin } from './helpers';

describe('Admin — autorização e validação', () => {
  beforeAll(resetDb);

  it('usuário comum recebe 403 em rota admin', async () => {
    const user = await registerUser();
    const res = await api.get('/api/v1/admin/metrics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('requisição sem token recebe 401, não 403 (não vaza que a rota existe)', async () => {
    const res = await api.get('/api/v1/admin/metrics');
    expect(res.status).toBe(401);
  });

  it('admin de verdade acessa métricas', async () => {
    const admin = await registerAdmin();
    const res = await api.get('/api/v1/admin/metrics').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
  });

  it('rejeita receita com lista de ingredientes vazia', async () => {
    const admin = await registerAdmin();
    const res = await api
      .post('/api/v1/admin/recipes')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        title: 'Receita inválida',
        category: 'SNACK',
        description: 'x',
        prepTimeMin: 5,
        ingredients: [],
        steps: ['Passo único'],
      });
    expect(res.status).toBe(400);
  });

  it('rejeita receita com ingrediente em branco', async () => {
    const admin = await registerAdmin();
    const res = await api
      .post('/api/v1/admin/recipes')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        title: 'Receita inválida',
        category: 'SNACK',
        description: 'x',
        prepTimeMin: 5,
        ingredients: [{ name: '   ' }],
        steps: ['Passo único'],
      });
    expect(res.status).toBe(400);
  });

  it('cria e edita uma receita válida', async () => {
    const admin = await registerAdmin();
    const create = await api
      .post('/api/v1/admin/recipes')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        title: 'Receita de teste',
        category: 'SNACK',
        description: 'Descrição',
        prepTimeMin: 5,
        ingredients: [{ name: 'Ingrediente 1' }],
        steps: ['Passo 1'],
      });
    expect(create.status).toBe(201);

    const edit = await api
      .put(`/api/v1/admin/recipes/${create.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Receita de teste (editada)' });
    expect(edit.status).toBe(200);
    expect(edit.body.title).toBe('Receita de teste (editada)');
  });

  it('cria banner e alterna ativo/inativo', async () => {
    const admin = await registerAdmin();
    const create = await api.post('/api/v1/admin/banners').set('Authorization', `Bearer ${admin.accessToken}`).send({ title: 'Banner teste' });
    expect(create.status).toBe(201);
    expect(create.body.active).toBe(true);

    const toggle = await api
      .patch(`/api/v1/admin/banners/${create.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ active: false });
    expect(toggle.status).toBe(200);
    expect(toggle.body.active).toBe(false);
  });

  it('retorna 404 limpo (não 500) ao editar receita inexistente', async () => {
    const admin = await registerAdmin();
    const res = await api
      .put('/api/v1/admin/recipes/id-que-nao-existe')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});
