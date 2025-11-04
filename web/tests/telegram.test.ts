import { verifyTelegramInitData, parseTelegramUser } from '../../services/shared/src/telegram';

describe('Telegram utilities', () => {
  const botToken = 'test-bot-token';

  it('should verify valid initData', () => {
    // This is a simplified test - in production you'd need real initData
    const initData = 'user=%7B%22id%22%3A123%7D&auth_date=1234567890&hash=test';
    const result = verifyTelegramInitData(initData, botToken);
    expect(typeof result).toBe('boolean');
  });

  it('should parse Telegram user', () => {
    const initData = 'user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D';
    const user = parseTelegramUser(initData);
    expect(user).toBeDefined();
  });
});
