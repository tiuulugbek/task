import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { commentRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const logger = createLogger('comment-service');
const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/comments', authMiddleware, commentRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'comment-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Comment service listening on port ${PORT}`);
});
