import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Access token de vida curta de propósito — quem garante sessões longas é o
// refresh token (opaco, revogável em banco; ver src/lib/tokens.ts). Se um
// access token vazar, a janela de uso indevido é pequena e ele não pode ser
// revogado antes de expirar sozinho.
export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign(payload, secret, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' } as jwt.SignOptions);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao painel administrativo.' });
  }
  next();
}
