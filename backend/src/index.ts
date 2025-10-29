import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import conversationRoutes from './routes/conversationRoutes';
import { SocketService } from './services/socketService';
import { CallService } from './grpc/callService';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051');

// Create Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'NosChat API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services
const socketService = new SocketService(io);
const callService = new CallService();

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP/WebSocket server
    httpServer.listen(PORT, () => {
      logger.info(`HTTP/WebSocket server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start gRPC server
    callService.start(GRPC_PORT);

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop gRPC server
  callService.stop();

  // Close Socket.IO connections
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  // Disconnect from database
  const { disconnectDatabase } = require('./config/database');
  await disconnectDatabase();

  process.exit(0);
}

// Start the server
startServer();

export { app, io };
