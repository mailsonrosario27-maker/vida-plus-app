import { beforeAll } from 'vitest';

// Rede de segurança: `resetDb()` apaga dados de verdade — se por engano
// alguém rodar a suíte de testes com um DATABASE_URL de dev/produção
// (arquivo .env errado, variável exportada manualmente no shell etc.),
// aborta antes de qualquer teste rodar em vez de arriscar apagar dados reais.
beforeAll(() => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `NODE_ENV é "${process.env.NODE_ENV}", esperado "test". Rode os testes via "npm test" (usa .env.test) — nunca aponte a suíte para o banco de dev/produção.`
    );
  }
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('ep-withered-breeze')) {
    throw new Error(
      'DATABASE_URL não parece ser o banco de teste dedicado (vida-plus-test). Abortando para não arriscar apagar dados de outro ambiente.'
    );
  }
});
