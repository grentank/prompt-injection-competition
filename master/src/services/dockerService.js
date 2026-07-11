const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const { Instance } = require('../../db/models');

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || 'pic-sandbox:latest';
const SANDBOX_NETWORK = process.env.SANDBOX_NETWORK || 'pic-network';
const SANDBOX_INTERNAL_PORT = 4100;
const MEMORY_LIMIT = Number(process.env.SANDBOX_MEMORY_MB || 256) * 1024 * 1024;

const startingInstances = new Set();

function containerName(instanceId) {
  return `pic-sandbox-${instanceId.slice(0, 8)}`;
}

function sandboxTarget(instanceId) {
  return `http://${containerName(instanceId)}:${SANDBOX_INTERNAL_PORT}`;
}

function buildSandboxEnv(instanceId, participantId, { resetDb = false } = {}) {
  return {
    INSTANCE_ID: instanceId,
    PARTICIPANT_ID: String(participantId),
    MASTER_URL: process.env.MASTER_INTERNAL_URL || 'http://pic-master:4000',
    EVENTS_TOKEN: process.env.EVENTS_TOKEN || 'pic-events-secret',
    LLM_PROVIDER_BASE_URL: process.env.LLM_PROVIDER_BASE_URL || '',
    LLM_PROVIDER_API_KEY: process.env.LLM_PROVIDER_API_KEY || '',
    AI_MODEL_NAME: process.env.AI_MODEL_NAME || 'openai/gpt-4o-mini',
    GUARDRAIL_MODEL_NAME: process.env.GUARDRAIL_MODEL_NAME || 'meta-llama/llama-guard-4-12b',
    NODE_ENV: 'production',
    PORT: String(SANDBOX_INTERNAL_PORT),
    DB_PATH: '/data/shop.sqlite',
    WORKSPACE_PATH: '/workspace',
    RESET_DB: resetDb ? '1' : '0',
  };
}

async function waitForHealthy(instanceId, timeoutMs = 90000) {
  const url = `${sandboxTarget(instanceId)}/api/health`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // container still starting
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function wipeVolume(volumeName) {
  try {
    await docker.getVolume(volumeName).remove({ force: true });
  } catch {
    // volume may not exist yet
  }
}

async function createAndStartContainer(instance, { resetData = false } = {}) {
  const name = containerName(instance.id);
  const env = buildSandboxEnv(instance.id, instance.participant_id, { resetDb: resetData });

  try {
    const old = docker.getContainer(name);
    await old.stop({ t: 3 }).catch(() => {});
    await old.remove({ force: true }).catch(() => {});
  } catch {
    // no previous container
  }

  if (resetData) {
    await wipeVolume(`pic-sandbox-${instance.id}`);
    await wipeVolume(`pic-workspace-${instance.id}`);
  }

  const container = await docker.createContainer({
    Image: SANDBOX_IMAGE,
    name,
    Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
    ExposedPorts: { [`${SANDBOX_INTERNAL_PORT}/tcp`]: {} },
    HostConfig: {
      Memory: MEMORY_LIMIT,
      Binds: [`pic-sandbox-${instance.id}:/data`, `pic-workspace-${instance.id}:/workspace`],
    },
    Labels: {
      'pic.instance_id': instance.id,
      'pic.participant_id': String(instance.participant_id),
    },
    NetworkingConfig: {
      EndpointsConfig: {
        [SANDBOX_NETWORK]: {},
      },
    },
  });

  await container.start();

  const healthy = await waitForHealthy(instance.id);
  await instance.update({
    container_id: container.id,
    status: healthy ? 'running' : 'unhealthy',
    env_json: JSON.stringify(env),
  });

  return instance;
}

async function ensureSandboxRunning(participantId) {
  let instance = await Instance.findOne({ where: { participant_id: participantId } });

  if (!instance) {
    const instanceId = uuidv4();
    instance = await Instance.create({
      id: instanceId,
      participant_id: participantId,
      status: 'starting',
      restart_count: 0,
      env_json: JSON.stringify(buildSandboxEnv(instanceId, participantId)),
    });
    startSandboxInBackground(instance);
    return instance;
  }

  if (instance.status === 'running') {
    return instance;
  }

  if (!startingInstances.has(instance.id)) {
    startSandboxInBackground(instance);
  }

  return instance;
}

function startSandboxInBackground(instance) {
  if (startingInstances.has(instance.id)) return;
  startingInstances.add(instance.id);

  (async () => {
    try {
      await instance.update({ status: 'starting' });
      await createAndStartContainer(instance);
    } catch (err) {
      console.error(`Sandbox start failed for ${instance.id}:`, err.message);
      await instance.update({ status: 'error' });
    } finally {
      startingInstances.delete(instance.id);
    }
  })();
}

async function startSandbox(participantId) {
  return ensureSandboxRunning(participantId);
}

async function restartSandbox(instanceId) {
  const instance = await Instance.findByPk(instanceId);
  if (!instance) throw new Error('Instance not found');

  if (instance.container_id) {
    try {
      const old = docker.getContainer(instance.container_id);
      await old.stop({ t: 5 }).catch(() => {});
      await old.remove({ force: true }).catch(() => {});
    } catch {
      // ignore
    }
  }

  await instance.update({
    status: 'starting',
    restart_count: instance.restart_count + 1,
  });

  await createAndStartContainer(instance, { resetData: true });
  return instance;
}

async function getInstanceTarget(instanceId) {
  const instance = await Instance.findByPk(instanceId);
  if (!instance) return null;

  const target = sandboxTarget(instanceId);

  if (instance.status !== 'running') {
    try {
      const res = await fetch(`${target}/api/health`);
      if (res.ok) {
        await instance.update({ status: 'running' });
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  return target;
}

module.exports = {
  startSandbox,
  restartSandbox,
  getInstanceTarget,
  ensureSandboxRunning,
  sandboxTarget,
  docker,
};
