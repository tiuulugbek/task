import { Bot, Context } from 'grammy';
import { createLogger } from '@acoustic/shared';

const logger = createLogger('telegram-bot-service');

const MINI_APP_URL = 'https://task.acoustic.uz';

export function setupCommands(bot: Bot, apiGatewayUrl: string) {
  bot.command('start', async (ctx: Context) => {
    await ctx.reply(
      `👋 Welcome to Acoustic Task Manager!\n\n` +
      `Use /help to see all available commands.\n\n` +
      `Open the app: ${MINI_APP_URL}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open App', web_app: { url: MINI_APP_URL } }
          ]],
        },
      }
    );
  });

  bot.command('help', async (ctx: Context) => {
    await ctx.reply(
      `📋 <b>Available Commands:</b>\n\n` +
      `/start - Start the bot\n` +
      `/newtask - Create a new task\n` +
      `/my - Show my tasks\n` +
      `/assign &lt;taskId&gt; @user - Assign user to task\n` +
      `/due &lt;taskId&gt; YYYY-MM-DD - Set task due date\n` +
      `/settings - Open settings\n\n` +
      `Open app: ${MINI_APP_URL}`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('newtask', async (ctx: Context) => {
    await ctx.reply(
      `To create a new task, please use the web app:\n${MINI_APP_URL}/projects`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open App', web_app: { url: `${MINI_APP_URL}/projects` } }
          ]],
        },
      }
    );
  });

  bot.command('my', async (ctx: Context) => {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply('Unable to identify user');
        return;
      }

      const userResponse = await fetch(`${apiGatewayUrl}/internal/users/by-tg-id/${tgId}`, {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      });

      if (!userResponse.ok) {
        await ctx.reply('User not found. Please login via the web app first.');
        return;
      }

      const user = await userResponse.json();
      const tasksResponse = await fetch(`${apiGatewayUrl}/api/tasks/search?assigneeId=${user.data.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_TOKEN || ''}`,
        },
      });

      if (!tasksResponse.ok) {
        await ctx.reply('Failed to fetch tasks');
        return;
      }

      const tasks = await tasksResponse.json();
      const taskList = tasks.data?.slice(0, 10).map((t: any, i: number) => 
        `${i + 1}. ${t.title} (${t.status})`
      ).join('\n') || 'No tasks assigned';

      await ctx.reply(
        `📋 <b>My Tasks:</b>\n\n${taskList}\n\n` +
        `View all: ${MINI_APP_URL}/dashboard`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '📱 Open App', web_app: { url: `${MINI_APP_URL}/dashboard` } }
            ]],
          },
        }
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to handle /my command');
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  bot.command('assign', async (ctx: Context) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    if (!args || args.length < 2) {
      await ctx.reply('Usage: /assign <taskId> @username');
      return;
    }

    const taskId = args[0];
    const username = args[1].replace('@', '');

    await ctx.reply(
      `To assign users to tasks, please use the web app:\n${MINI_APP_URL}/tasks/${taskId}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open Task', web_app: { url: `${MINI_APP_URL}/tasks/${taskId}` } }
          ]],
        },
      }
    );
  });

  bot.command('due', async (ctx: Context) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    if (!args || args.length < 2) {
      await ctx.reply('Usage: /due <taskId> YYYY-MM-DD');
      return;
    }

    const taskId = args[0];
    const dueDate = args[1];

    await ctx.reply(
      `To set due dates, please use the web app:\n${MINI_APP_URL}/tasks/${taskId}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open Task', web_app: { url: `${MINI_APP_URL}/tasks/${taskId}` } }
          ]],
        },
      }
    );
  });

  bot.command('settings', async (ctx: Context) => {
    await ctx.reply(
      `Open settings in the web app:\n${MINI_APP_URL}/settings`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open Settings', web_app: { url: `${MINI_APP_URL}/settings` } }
          ]],
        },
      }
    );
  });

  bot.on('message', async (ctx: Context) => {
    const text = ctx.message?.text;
    if (text?.startsWith('/')) return;

    if (text?.includes('task_') || text?.includes('project_')) {
      const match = text.match(/(?:task_|project_)([a-f0-9-]+)/i);
      if (match) {
        const id = match[1];
        const url = text.includes('task_') 
          ? `${MINI_APP_URL}/tasks/${id}`
          : `${MINI_APP_URL}/projects/${id}`;
        
        await ctx.reply('Opening in app...', {
          reply_markup: {
            inline_keyboard: [[
              { text: '📱 Open', web_app: { url } }
            ]],
          },
        });
      }
    }
  });

  logger.info('Bot commands configured');
}
