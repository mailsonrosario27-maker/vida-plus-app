import pino from 'pino';

// Logs estruturados em JSON (essencial para qualquer plataforma de logs real
// como Render/Datadog conseguir filtrar por campo). Em dev, formata bonito no
// terminal via pino-pretty; em produção, sai JSON puro por linha.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'newPassword',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
});
