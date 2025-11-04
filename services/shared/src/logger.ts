import pino from 'pino';
import { randomUUID } from 'crypto';

export const createLogger = (serviceName: string) => {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: {
          'x-correlation-id': req.headers?.['x-correlation-id'],
          'user-agent': req.headers?.['user-agent'],
        },
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },
  });
};

export const getCorrelationId = (headers: Record<string, string | string[] | undefined>): string => {
  const id = headers['x-correlation-id'];
  return Array.isArray(id) ? id[0] : id || randomUUID();
};
