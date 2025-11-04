import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { taskRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { internalAuthMiddleware } from './middleware/internalAuth';

const logger = createLogger('task-service');
const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/internal/tasks', internalAuthMiddleware, taskRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Task service listening on port ${PORT}`);
});
import { internalRoutes } from './routes/internalRoutes';

app.use('/internal/tasks', internalRoutes);
