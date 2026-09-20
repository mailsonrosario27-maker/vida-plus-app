import { randomBytes, createHash } from 'node:crypto';

// Refresh tokens e tokens de reset de senha são opacos (não-JWT) de propósito:
// um JWT não pode ser "esquecido" pelo servidor antes de expirar — só dá pra
// esperar. Guardando um hash em banco, dá pra revogar de verdade a qualquer
// momento (logout, troca de senha, "sair de todos os dispositivos").
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
