import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@acoustic/shared';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const prisma = new PrismaClient();
const logger = createLogger('attachment-service');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const USE_S3 = process.env.USE_S3 === 'true';
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT;

let s3Client: S3Client | null = null;

if (USE_S3 && S3_ACCESS_KEY && S3_SECRET_KEY) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    ...(S3_ENDPOINT && { endpoint: S3_ENDPOINT }),
  });
}

async function checkTaskPermission(userId: string, taskId: string) {
  const taskResponse = await fetch(
    `${process.env.TASK_SERVICE_URL || 'http://task-service:3005'}/internal/tasks/${taskId}`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!taskResponse.ok) {
    throw new Error('Task not found');
  }

  return true;
}

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { taskId } = req.body;

    if (!taskId || !req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'taskId and file are required' },
      });
    }

    await checkTaskPermission(userId, taskId);

    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    let storagePath = '';

    if (USE_S3 && s3Client) {
      const key = `attachments/${taskId}/${fileHash}-${req.file.originalname}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      storagePath = key;
    } else {
      const filename = `${fileHash}-${req.file.originalname}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      storagePath = filename;
    }

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath,
      },
    });

    res.json({ success: true, data: attachment });
  } catch (error: any) {
    logger.error({ error }, 'Failed to upload file');
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_FAILED', message: error.message },
    });
  }
};

export const getFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found' },
      });
    }

    await checkTaskPermission(userId, attachment.taskId);

    res.json({ success: true, data: attachment });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get file');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const getDownloadUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found' },
      });
    }

    await checkTaskPermission(userId, attachment.taskId);

    let downloadUrl = '';

    if (USE_S3 && s3Client) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: attachment.storagePath,
      });
      downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } else {
      downloadUrl = `${process.env.APP_BASE_URL || 'https://task.acoustic.uz'}/api/attachments/${attachment.id}/file`;
    }

    res.json({ success: true, data: { url: downloadUrl, attachment } });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get download URL');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const listFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { taskId } = req.params;

    await checkTaskPermission(userId, taskId);

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: attachments });
  } catch (error: any) {
    logger.error({ error }, 'Failed to list files');
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
    });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found' },
      });
    }

    await checkTaskPermission(userId, attachment.taskId);

    if (USE_S3 && s3Client) {
      // Delete from S3 would go here
    } else {
      const filepath = path.join(UPLOAD_DIR, attachment.storagePath);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    await prisma.attachment.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Failed to delete file');
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message },
    });
  }
};
