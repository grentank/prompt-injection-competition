const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  Participant,
  AdminUser,
  Instance,
  Task,
  TaskCompletion,
} = require('../../db/models');
const { signToken } = require('../middleware/auth');
const { startSandbox } = require('../services/dockerService');

async function register(req, res) {
  const { nickname, password } = req.body || {};
  if (!nickname?.trim() || !password) {
    return res.status(400).json({ error: 'nickname and password required' });
  }

  const existing = await Participant.findOne({ where: { nickname: nickname.trim() } });
  if (existing) {
    return res.status(409).json({ error: 'Nickname taken' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const participant = await Participant.create({ nickname: nickname.trim(), password_hash });

  const tasks = await Task.findAll();
  await TaskCompletion.bulkCreate(
    tasks.map((t) => ({ participant_id: participant.id, task_id: t.id })),
  );

  let instance = await Instance.findOne({ where: { participant_id: participant.id } });
  if (!instance) {
    instance = await startSandbox(participant.id);
  }

  const token = signToken({ role: 'participant', participantId: participant.id, instanceId: instance.id });

  res.json({
    token,
    participant: { id: participant.id, nickname: participant.nickname },
    instanceId: instance.id,
  });
}

async function login(req, res) {
  const { nickname, password } = req.body || {};
  const participant = await Participant.findOne({ where: { nickname: nickname?.trim() } });
  if (!participant) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, participant.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let instance = await Instance.findOne({ where: { participant_id: participant.id } });
  if (!instance) {
    instance = await startSandbox(participant.id);
  }

  const token = signToken({ role: 'participant', participantId: participant.id, instanceId: instance.id });

  res.json({
    token,
    participant: { id: participant.id, nickname: participant.nickname },
    instanceId: instance.id,
  });
}

async function adminLogin(req, res) {
  const { username, password } = req.body || {};
  const admin = await AdminUser.findOne({ where: { username } });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ role: 'admin', adminId: admin.id });
  res.json({ token, admin: { id: admin.id, username: admin.username } });
}

async function me(req, res) {
  if (req.user.role === 'participant') {
    const participant = await Participant.findByPk(req.user.participantId, {
      include: [{ model: Instance }],
    });
    return res.json({
      role: 'participant',
      participant: { id: participant.id, nickname: participant.nickname },
      instanceId: participant.Instance?.id,
    });
  }
  res.json({ role: req.user.role });
}

module.exports = { register, login, adminLogin, me };
