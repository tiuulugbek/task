import amqp from 'amqplib';
import { PrismaClient } from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '@acoustic/shared';

const logger = createLogger('notification-service');
const prisma = new PrismaClient();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://acoustic:acoustic_password@rabbitmq:5672';

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

async function handleTaskAssigned(payload: any) {
  const { taskId, userIds } = payload;

  try {
    const taskResponse = await fetch(
      `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/${taskId}`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!taskResponse.ok) return;

    const task = await taskResponse.json();

    for (const userId of userIds || []) {
      const tgId = await getUserTelegramId(userId);
      if (tgId) {
        await sendTelegramDM(
          tgId,
          `🎯 <b>Task Assigned</b>\n\n` +
          `Task: ${task.data.title}\n` +
          `Project: ${task.data.projectId}\n\n` +
          `View: https://task.acoustic.uz/projects/${task.data.projectId}/tasks/${taskId}`
        );

        await prisma.notification.create({
          data: {
            userId,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned to task: ${task.data.title}`,
          },
        });
      }
    }
  } catch (error: any) {
    logger.error({ error, payload }, 'Failed to handle task assigned');
  }
}

async function handleStatusChanged(payload: any) {
  const { taskId, oldStatus, newStatus, userId } = payload;

  try {
    const taskResponse = await fetch(
      `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/${taskId}`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!taskResponse.ok) return;

    const task = await taskResponse.json();

    const watchersResponse = await fetch(
      `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/${taskId}/watchers`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!watchersResponse.ok) return;

    const watchers = await watchersResponse.json();

    for (const watcher of watchers.data || []) {
      if (watcher.userId === userId) continue;

      const tgId = await getUserTelegramId(watcher.userId);
      if (tgId) {
        await sendTelegramDM(
          tgId,
          `🔄 <b>Task Status Changed</b>\n\n` +
          `Task: ${task.data.title}\n` +
          `${oldStatus} → ${newStatus}\n\n` +
          `View: https://task.acoustic.uz/projects/${task.data.projectId}/tasks/${taskId}`
        );

        await prisma.notification.create({
          data: {
            userId: watcher.userId,
            type: 'status_changed',
            title: 'Status Changed',
            message: `Task "${task.data.title}" status changed from ${oldStatus} to ${newStatus}`,
          },
        });
      }
    }
  } catch (error: any) {
    logger.error({ error, payload }, 'Failed to handle status changed');
  }
}

export async function startEventConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange('amq.topic', 'topic', { durable: true });

    const queue = await channel.assertQueue('notification_queue', { durable: true });
    await channel.bindQueue(queue.queue, 'amq.topic', 'task.*');

    logger.info('Event consumer started');

    await channel.consume(queue.queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;

        if (routingKey === 'task.assignees_changed') {
          await handleTaskAssigned(content.payload);
        } else if (routingKey === 'task.status_changed') {
          await handleStatusChanged(content.payload);
        }

        channel.ack(msg);
      } catch (error: any) {
        logger.error({ error, msg: msg.content.toString() }, 'Failed to process message');
        channel.nack(msg, false, false);
      }
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to start event consumer');
    setTimeout(startEventConsumer, 5000);
  }
}
