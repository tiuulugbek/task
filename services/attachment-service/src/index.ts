import express from 'express';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { attachmentRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const logger = createLogger('attachment-service');
const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/attachments', authMiddleware, attachmentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'attachment-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Attachment service listening on port ${PORT}`);
});
