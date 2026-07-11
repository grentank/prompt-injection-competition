const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { initWebSocket } = require('./ws/adminWs');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`PIC master listening on :${PORT}`);
});
