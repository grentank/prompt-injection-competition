const MASTER_URL = process.env.MASTER_URL || 'http://localhost:4000';
const EVENTS_TOKEN = process.env.EVENTS_TOKEN || 'pic-events-secret';

async function reportEvent(event_type, payload = {}) {
  try {
    await fetch(`${MASTER_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Events-Token': EVENTS_TOKEN,
      },
      body: JSON.stringify({
        participant_id: Number(process.env.PARTICIPANT_ID) || null,
        instance_id: process.env.INSTANCE_ID || null,
        event_type,
        payload,
      }),
    });
  } catch (err) {
    console.error('Event report failed:', err.message);
  }
}

module.exports = { reportEvent };
