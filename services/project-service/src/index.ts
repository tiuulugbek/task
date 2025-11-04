import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { projectRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const logger = createLogger('project-service');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/projects', authMiddleware, projectRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'project-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Project service listening on port ${PORT}`);
});
import { internalRoutes } from './routes/internalRoutes';

app.use('/internal/projects', internalRoutes);
