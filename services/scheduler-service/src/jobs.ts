import { createLogger } from '@acoustic/shared';

const logger = createLogger('scheduler-service');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:3000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'internal-secret';

export async function sendDailyDigest() {
  logger.info('Executing daily digest job');

  try {
    const response = await fetch(`${API_GATEWAY_URL}/internal/notifications/daily-digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
    });

    if (!response.ok) {
      logger.error('Failed to trigger daily digest');
    } else {
      logger.info('Daily digest job completed');
    }
  } catch (error: any) {
    logger.error({ error }, 'Error in daily digest job');
  }
}

export async function sendReminders() {
  logger.info('Executing reminder check job');

  try {
    const response = await fetch(`${API_GATEWAY_URL}/internal/notifications/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
    });

    if (!response.ok) {
      logger.error('Failed to trigger reminders');
    } else {
      logger.info('Reminder check job completed');
    }
  } catch (error: any) {
    logger.error({ error }, 'Error in reminder check job');
  }
}
