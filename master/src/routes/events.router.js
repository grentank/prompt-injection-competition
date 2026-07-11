const { Router } = require('express');
const { ingestEvent } = require('../services/eventService');

const eventsRouter = Router();

eventsRouter.post('/', async (req, res) => {
  const token = req.headers['x-events-token'];
  if (token !== (process.env.EVENTS_TOKEN || 'pic-events-secret')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { participant_id, instance_id, event_type, payload } = req.body || {};
  if (!event_type) {
    return res.status(400).json({ error: 'event_type required' });
  }

  await ingestEvent({ participant_id, instance_id, event_type, payload });
  res.json({ ok: true });
});

module.exports = eventsRouter;
