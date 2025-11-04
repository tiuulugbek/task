import { Request, Response } from 'express';
import {
  verifyAndCreateSession,
  refreshAccessToken as refreshTokenService,
  logout as logoutService,
} from '../services/authService';
import { verifyToken } from '../services/authService';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export const verifyTelegram = async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_INIT_DATA', message: 'initData is required' },
      });
    }

    const result = await verifyAndCreateSession(initData, BOT_TOKEN);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: error.message },
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshTokenValue) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' },
      });
    }

    const accessToken = await refreshTokenService(refreshTokenValue);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_REFRESH_TOKEN', message: error.message },
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await logoutService(token);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LOGOUT_FAILED', message: error.message },
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Authentication required' },
      });
    }

    const payload = verifyToken(token);

    const userResponse = await fetch(
      `${process.env.USER_SERVICE_URL || 'http://user-service:3002'}/internal/users/${payload.userId}`,
      {
        headers: {
          'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error('User not found');
    }

    const user = await userResponse.json();

    res.json({
      success: true,
      data: user.data,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: error.message },
    });
  }
};
