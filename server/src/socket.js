let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: {
      origin: '*', // Allow connections from frontend dev server
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    // Client joins a session-specific room
    socket.on('joinSession', (sessionId) => {
      if (sessionId) {
        socket.join(`session_${sessionId}`);
      }
    });

    socket.on('leaveSession', (sessionId) => {
      if (sessionId) {
        socket.leave(`session_${sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized!');
  }
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO
};
