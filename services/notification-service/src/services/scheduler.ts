import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '@acoustic/shared';

const logger = createLogger('notification-service');
const prisma = new PrismaClient();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

let bot: TelegramBot | null = null;

if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN);
}

async function getUserTelegramId(userId: string): Promise<number | null> {
  try {
    const userResponse = await fetch(
      `${process.env.USER_SERVICE_URL || 'http://user-service:3002'}/internal/users/${userId}`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!userResponse.ok) return null;

    const user = await userResponse.json();
    return parseInt(user.data.tgId, 10);
  } catch {
    return null;
  }
}

async function sendTelegramDM(chatId: number, message: string) {
  if (!bot) return;

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error: any) {
    logger.error({ error, chatId }, 'Failed to send Telegram DM');
  }
}

async function sendDailyDigest() {
  logger.info('Starting daily digest job');

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksResponse = await fetch(
      `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/search?due=today`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!tasksResponse.ok) {
      logger.error('Failed to fetch tasks for digest');
      return;
    }

    const tasks = await tasksResponse.json();

    const usersMap = new Map<string, any[]>();

    for (const task of tasks.data || []) {
      for (const assignee of task.assignees || []) {
        if (!usersMap.has(assignee.userId)) {
          usersMap.set(assignee.userId, []);
        }
        usersMap.get(assignee.userId)!.push(task);
      }
    }

    for (const [userId, userTasks] of usersMap.entries()) {
      const tgId = await getUserTelegramId(userId);
      if (tgId && userTasks.length > 0) {
        const message = 
          `📋 <b>Daily Digest - ${today.toLocaleDateString()}</b>\n\n` +
          `<b>Tasks due today:</b>\n` +
          userTasks.map((t, i) => `${i + 1}. ${t.title} (${t.priority})`).join('\n') +
          `\n\nView all: https://task.acoustic.uz/dashboard`;

        await sendTelegramDM(tgId, message);
      }
    }

    logger.info(`Daily digest sent to ${usersMap.size} users`);
  } catch (error: any) {
    logger.error({ error }, 'Failed to send daily digest');
  }
}

export function startScheduler() {
  cron.schedule('0 9 * * *', () => {
    sendDailyDigest();
  }, {
    timezone: 'Asia/Tashkent',
  });

  logger.info('Scheduler started (daily digest at 09:00 Asia/Tashkent)');
}
