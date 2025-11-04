import express from 'express';
import { Bot, webhookCallback } from 'grammy';
import { createLogger, getCorrelationId } from '@acoustic/shared';
import { setupCommands } from './commands';

const logger = createLogger('telegram-bot-service');
const app = express();
const PORT = process.env.PORT || 3009;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://task.acoustic.uz/api/bot/webhook';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:3000';

if (!BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

app.use(express.json());

app.use((req, res, next) => {
  const correlationId = getCorrelationId(req.headers);
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use('/api/bot/webhook', (req, res, next) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}, webhookCallback(bot, 'express'));

setupCommands(bot, API_GATEWAY_URL);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'telegram-bot-service' });
});

app.listen(PORT, () => {
  logger.info(`Telegram Bot service listening on port ${PORT}`);
  logger.info(`Webhook URL: ${WEBHOOK_URL}`);
});
