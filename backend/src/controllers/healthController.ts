import { Request, Response } from 'express';

export function healthController(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: {
      service: 'splitwise-backend',
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
  });
}
