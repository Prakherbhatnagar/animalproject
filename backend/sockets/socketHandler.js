import logger from '../config/logger.js';

export const setupSockets = (io) => {
  io.on('connection', (socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);

    // Join a specific report room for tracking
    socket.on('join_report', (reportId) => {
      socket.join(reportId);
      logger.info(`Extracted client to room: ${reportId}`);
    });

    // Handle real-time footprint / tracking of rescuer's location
    socket.on('update_location', (data) => {
      const { reportId, lat, lng } = data;
      // Broadcast this back to the room so frontend map updates immediately
      if (reportId && lat && lng) {
        io.to(reportId).emit('location_updated', { reportId, lat, lng, timestamp: new Date() });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};
