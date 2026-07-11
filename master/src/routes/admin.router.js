const { Router } = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { getParticipantStats, markTaskComplete } = require('../services/eventService');
const { restartSandbox, getInstanceTarget } = require('../services/dockerService');
const { Task, TaskCompletion, Instance } = require('../../db/models');
const { broadcastAdmin } = require('../ws/adminWs');

const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/participants', async (_req, res) => {
  const stats = await getParticipantStats();
  res.json({ participants: stats });
});

adminRouter.get('/tasks', async (_req, res) => {
  const tasks = await Task.findAll({ order: [['sort_order', 'ASC']] });
  res.json({ tasks });
});

adminRouter.patch('/participants/:participantId/tasks/:taskId', async (req, res) => {
  const { participantId, taskId } = req.params;
  const { completed } = req.body || {};

  const [completion] = await TaskCompletion.findOrCreate({
    where: { participant_id: participantId, task_id: taskId },
    defaults: {},
  });

  if (completed) {
    await completion.update({
      completed_at: completion.completed_at || new Date(),
      manual_override: true,
    });
  } else {
    await completion.update({
      completed_at: null,
      manual_override: false,
      auto_detected: false,
    });
  }

  broadcastAdmin({ type: 'task_manual_update', participantId, taskId, completed });
  res.json({ ok: true });
});

adminRouter.post('/instances/:instanceId/restart', async (req, res) => {
  const instance = await restartSandbox(req.params.instanceId);
  broadcastAdmin({ type: 'instance_restarted', instanceId: instance.id });
  res.json({ instance });
});

adminRouter.post('/instances/:instanceId/sql', async (req, res) => {
  const { query } = req.body || {};
  const target = await getInstanceTarget(req.params.instanceId);
  if (!target) return res.status(503).json({ error: 'Instance not ready' });

  const response = await fetch(`${target}/api/admin/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  res.status(response.status).json(data);
});

adminRouter.get('/instances/:instanceId/stats', async (req, res) => {
  const target = await getInstanceTarget(req.params.instanceId);
  if (!target) return res.status(503).json({ error: 'Instance not ready' });

  const response = await fetch(`${target}/api/admin/stats`);
  const data = await response.json();
  res.json(data);
});

module.exports = adminRouter;
