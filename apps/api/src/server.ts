import 'dotenv/config';
import { getEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { logger } from './config/logger.js';
import app from './app.js';

async function main() {
  const env = getEnv();

  await connectDB();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`🚀 API server running on http://localhost:${env.API_PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    server.close(async () => {
      await disconnectDB();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
