import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import app from './app.js';
import logger from './config/logger.js';
import { setupSockets } from './sockets/socketHandler.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup custom socket logic handlers
setupSockets(io);

// Pass io to routes so controllers can dispatch events
app.set('socketio', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`[Server] running on port ${PORT}`);
});
