const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authRouter = require('./routes/auth.router');
const adminRouter = require('./routes/admin.router');
const eventsRouter = require('./routes/events.router');
const { authMiddleware } = require('./middleware/auth');
const { register, login, adminLogin, me } = require('./routes/auth.router');
const { getInstanceTarget, restartSandbox } = require('./services/dockerService');
const { Instance } = require('../db/models');
const { broadcastAdmin } = require('./ws/adminWs');

const app = express();
const jsonParser = express.json({ limit: '2mb' });

app.use(morgan('dev'));
app.use(cors());

app.post('/api/auth/register', jsonParser, register);
app.post('/api/auth/login', jsonParser, login);
app.post('/api/auth/admin/login', jsonParser, adminLogin);
app.get('/api/auth/me', authMiddleware, me);
app.use('/api/admin', jsonParser, adminRouter);
app.use('/api/events', jsonParser, eventsRouter);

app.post('/api/instances/:instanceId/restart', jsonParser, authMiddleware, async (req, res) => {
  const instance = await Instance.findByPk(req.params.instanceId);
  if (!instance) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'participant' && instance.participant_id !== req.user.participantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const updated = await restartSandbox(instance.id);
  broadcastAdmin({ type: 'instance_restarted', instanceId: updated.id });
  res.json({ instance: updated });
});

app.get('/api/instances/:instanceId/status', authMiddleware, async (req, res) => {
  const instance = await Instance.findByPk(req.params.instanceId);
  if (!instance) return res.status(404).json({ error: 'Not found' });
  res.json({ id: instance.id, status: instance.status });
});

app.use('/instance/:instanceId/api', async (req, res, next) => {
  const target = await getInstanceTarget(req.params.instanceId);
  if (!target) {
    const instance = await Instance.findByPk(req.params.instanceId);
    const status = instance?.status || 'not_found';
    return res.status(503).json({ error: 'Sandbox not ready', status });
  }

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`,
    proxyTimeout: 0,
    timeout: 0,
    on: {
      error: (_err, _req, res) => {
        if (!res.headersSent) {
          res.status(502).json({ error: 'Sandbox unavailable' });
        }
      },
    },
  })(req, res, next);
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Build client first: cd client && npm run build');
  });
});

module.exports = app;
