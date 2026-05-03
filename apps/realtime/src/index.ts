import 'dotenv/config';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { db } from '@flowforge/db';
import logger from '@flowforge/logger';
import { websocketConnections } from '@flowforge/observability';

const PORT = parseInt(process.env.REALTIME_PORT || '3001');

const startRealtime = async () => {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  await db.$connect();

  const executionRooms = new Map<string, Set<string>>();

  io.on('connection', (socket) => {
    websocketConnections.inc();
    logger.info({ socketId: socket.id }, 'Client connected');

    socket.on('join-execution', async (executionId: string) => {
      socket.join(`execution:${executionId}`);
      
      if (!executionRooms.has(executionId)) {
        executionRooms.set(executionId, new Set());
      }
      executionRooms.get(executionId)!.add(socket.id);
      
      logger.info({ executionId, socketId: socket.id }, 'Joined execution room');
    });

    socket.on('leave-execution', (executionId: string) => {
      socket.leave(`execution:${executionId}`);
      executionRooms.get(executionId)?.delete(socket.id);
      
      logger.info({ executionId, socketId: socket.id }, 'Left execution room');
    });

    socket.on('disconnect', () => {
      websocketConnections.dec();
      logger.info({ socketId: socket.id }, 'Client disconnected');
      
      executionRooms.forEach((sockets) => sockets.delete(socket.id));
    });
  });

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Realtime server started');
  });

  const shutdown = async () => {
     logger.info('Shutting down realtime server...');
     await io.close();
     await db.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startRealtime().catch((error) => {
  logger.error(error, 'Failed to start realtime server');
  process.exit(1);
});