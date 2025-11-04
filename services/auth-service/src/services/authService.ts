import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { verifyTelegramInitData, parseTelegramUser } from '@acoustic/shared';
import { JWTPayload } from '@acoustic/shared';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export const verifyAndCreateSession = async (
  initData: string,
  botToken: string
): Promise<AuthResult> => {
  if (!verifyTelegramInitData(initData, botToken)) {
    throw new Error('Invalid Telegram initData');
  }

  const telegramUser = parseTelegramUser(initData);
  if (!telegramUser) {
    throw new Error('Failed to parse Telegram user');
  }

  // Call user service to get or create user
  const userResponse = await fetch(
    `${process.env.USER_SERVICE_URL || 'http://user-service:3002'}/internal/users/by-tg-id/${telegramUser.id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!userResponse.ok) {
    if (userResponse.status === 404) {
      // Create new user
      const createResponse = await fetch(
        `${process.env.USER_SERVICE_URL || 'http://user-service:3002'}/internal/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
          },
          body: JSON.stringify({
            tgId: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            photoUrl: telegramUser.photo_url,
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await createResponse.json();
      return createSessionForUser(newUser.data.id, telegramUser.id);
    }
    throw new Error('Failed to get user');
  }

  const user = await userResponse.json();
  return createSessionForUser(user.data.id, telegramUser.id);
};

const createSessionForUser = async (userId: string, tgId: number): Promise<AuthResult> => {
  const payload: JWTPayload = {
    userId,
    tgId,
    iat: Math.floor(Date.now() / 1000),
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId, tgId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId,
      token: accessToken,
      refreshToken,
      expiresAt,
    },
  });

  return { accessToken, refreshToken, userId };
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; tgId: number };
    
    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    const payload: JWTPayload = {
      userId: decoded.userId,
      tgId: decoded.tgId,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

    await prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return accessToken;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const logout = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const expiresAt = new Date((decoded.exp || 0) * 1000);

    await prisma.tokenBlacklist.create({
      data: {
        token,
        expiresAt,
      },
    });

    await prisma.session.deleteMany({
      where: { token },
    });
  } catch (error) {
    // Token might be invalid, ignore
  }
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const blacklisted = await prisma.tokenBlacklist.findUnique({
    where: { token },
  });

  if (!blacklisted) return false;

  if (blacklisted.expiresAt < new Date()) {
    await prisma.tokenBlacklist.delete({ where: { id: blacklisted.id } });
    return false;
  }

  return true;
};
