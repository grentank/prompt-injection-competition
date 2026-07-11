const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws/admin' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'Token required');
      return;
    }

    try {
      const jwt = require('jsonwebtoken');
      const user = jwt.verify(token, process.env.JWT_SECRET || 'pic-dev-secret-change-me');
      if (user.role !== 'admin') {
        ws.close(4003, 'Admin only');
        return;
      }
    } catch {
      ws.close(4002, 'Invalid token');
      return;
    }

    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });
}

function broadcastAdmin(message) {
  const data = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

module.exports = { initWebSocket, broadcastAdmin };
