import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createLogger, getCorrelationId } from '@acoustic/shared';

const logger = createLogger('api-gateway');
const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://task.acoustic.uz';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
}));

app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use('/api/auth', authLimiter);
app.use('/api/bot/webhook', webhookLimiter);

const services: Record<string, string> = {
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  '/api/users': process.env.USER_SERVICE_URL || 'http://user-service:3002',
  '/api/workspaces': process.env.WORKSPACE_SERVICE_URL || 'http://workspace-service:3003',
  '/api/projects': process.env.PROJECT_SERVICE_URL || 'http://project-service:3004',
  '/api/tasks': process.env.TASK_SERVICE_URL || 'http://task-service:3005',
  '/api/comments': process.env.COMMENT_SERVICE_URL || 'http://comment-service:3006',
  '/api/attachments': process.env.ATTACHMENT_SERVICE_URL || 'http://attachment-service:3007',
  '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008',
  '/api/bot': process.env.TELEGRAM_BOT_SERVICE_URL || 'http://telegram-bot-service:3009',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${path}`]: path === '/api/bot' ? '/api/bot' : '',
      },
      onProxyReq: (proxyReq, req) => {
        if (req.cookies?.accessToken) {
          proxyReq.setHeader('authorization', `Bearer ${req.cookies.accessToken}`);
        }
      },
      onError: (err, req, res) => {
        logger.error({ err, path: req.url }, 'Proxy error');
        res.status(502).json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' },
        });
      },
    })
  );
});

app.get('/healthz', async (_req, res) => {
  const healthChecks: Record<string, string> = {};
  
  for (const [path, url] of Object.entries(services)) {
    try {
      const response = await fetch(`${url}/health`);
      healthChecks[path] = response.ok ? 'ok' : 'down';
    } catch {
      healthChecks[path] = 'down';
    }
  }

  const allHealthy = Object.values(healthChecks).every(status => status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    services: healthChecks,
  });
});

app.get('/api/docs', (_req, res) => {
  res.json({
    info: {
      title: 'Acoustic Task Manager API',
      version: '1.0.0',
    },
    paths: {
      '/auth': 'Authentication endpoints',
      '/workspaces': 'Workspace management',
      '/projects': 'Project and board management',
      '/tasks': 'Task CRUD and search',
      '/comments': 'Task comments',
      '/attachments': 'File uploads',
    },
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});
