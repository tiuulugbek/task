import cron from 'node-cron';
import { createLogger } from '@acoustic/shared';
import { sendDailyDigest, sendReminders } from './jobs';

const logger = createLogger('scheduler-service');

logger.info('Starting scheduler service...');

cron.schedule('0 9 * * *', () => {
  logger.info('Running daily digest job');
  sendDailyDigest();
}, {
  timezone: 'Asia/Tashkent',
});

cron.schedule('0 * * * *', () => {
  logger.info('Running reminder check job');
  sendReminders();
}, {
  timezone: 'Asia/Tashkent',
});

logger.info('Scheduler service started');
logger.info('- Daily digest: 09:00 Asia/Tashkent');
logger.info('- Reminder checks: Every hour');

process.on('SIGTERM', () => {
  logger.info('Scheduler service shutting down');
  process.exit(0);
});
