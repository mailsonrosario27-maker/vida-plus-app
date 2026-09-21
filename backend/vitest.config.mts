import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 15000,
    hookTimeout: 20000,
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // testes de integração compartilham um banco real — evita corrida entre arquivos
  },
});
