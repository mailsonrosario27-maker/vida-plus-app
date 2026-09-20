import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';

export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos.', details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Referência inválida.' });
    if (err.code === 'P2034') return res.status(409).json({ error: 'Conflito de concorrência, tente novamente.' });
  }
  const requestId = (req as Request & { id?: string }).id;
  logger.error({ err, requestId, path: req.path, method: req.method }, 'Erro não tratado');

  // Em produção, nunca devolve a mensagem crua do erro (pode vazar detalhe
  // interno tipo string de conexão, caminho de arquivo, nome de coluna) —
  // ela já foi para o log estruturado acima, é lá que se investiga.
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Erro interno. Tente novamente em instantes.'
      : err instanceof Error
        ? err.message
        : 'Erro interno.';
  res.status(500).json({ error: message, requestId });
}
