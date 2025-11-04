import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { userRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { internalAuthMiddleware } from './middleware/internalAuth';

const logger = createLogger('user-service');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/internal/users', internalAuthMiddleware, userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`User service listening on port ${PORT}`);
});
import { internalRoutes } from './routes/internalRoutes';

app.use('/internal/users', internalRoutes);
