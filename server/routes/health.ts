import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Health check endpoint
 * No authentication required - used for monitoring and load balancer checks
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

export default router;
