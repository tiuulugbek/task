import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createUserSchema = z.object({
  tgId: z.number(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const user = await prisma.user.create({
      data: {
        tgId: BigInt(data.tgId),
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        photoUrl: data.photoUrl,
      },
    });

    res.json({
      success: true,
      data: {
        ...user,
        tgId: user.tgId.toString(),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message },
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        tgId: user.tgId.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const getUserByTgId = async (req: Request, res: Response) => {
  try {
    const tgId = BigInt(req.params.tgId);
    const user = await prisma.user.findUnique({
      where: { tgId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        tgId: user.tgId.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const updateData: any = {};
    if (req.body.username !== undefined) updateData.username = req.body.username;
    if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
    if (req.body.photoUrl !== undefined) updateData.photoUrl = req.body.photoUrl;
    if (req.body.locale !== undefined) updateData.locale = req.body.locale;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        ...user,
        tgId: user.tgId.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
};
