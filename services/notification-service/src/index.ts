import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { startEventConsumer } from './services/eventConsumer';
import { startScheduler } from './services/scheduler';
import { errorHandler } from './middleware/errorHandler';

const logger = createLogger('notification-service');
const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`Notification service listening on port ${PORT}`);
  await startEventConsumer();
  startScheduler();
});
