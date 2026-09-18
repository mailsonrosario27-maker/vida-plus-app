import { setDefaultResultOrder } from 'node:dns';
import { PrismaClient } from '@prisma/client';

// Alguns ambientes resolvem o host da Neon para um endereço IPv6 lento/instável
// antes de tentar IPv4, fazendo a conexão do Prisma falhar ou demorar demais.
// Forçar IPv4 primeiro evita esse problema sem depender de configuração externa.
setDefaultResultOrder('ipv4first');

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
