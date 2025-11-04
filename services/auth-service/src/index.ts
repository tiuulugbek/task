import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { authRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const logger = createLogger('auth-service');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://task.acoustic.uz',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});

export default app;
