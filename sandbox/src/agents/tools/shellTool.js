const { exec } = require('child_process');
const { promisify } = require('util');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { reportEvent } = require('../../services/eventReporter');

const execAsync = promisify(exec);
const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

const runShellTool = tool(
  async ({ command }) => {
    const cmd = String(command ?? '').trim();
    if (!cmd) return JSON.stringify({ error: 'Empty command' });

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: WORKSPACE,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      await reportEvent('code_executed', { type: 'shell', command: cmd });
      return JSON.stringify({ command: cmd, stdout, stderr });
    } catch (error) {
      return JSON.stringify({ command: cmd, error: error.message, stdout: error.stdout, stderr: error.stderr });
    }
  },
  {
    name: 'run_shell',
    description: 'Execute a shell command in the sandbox workspace.',
    schema: z.object({ command: z.string() }),
  },
);

module.exports = { runShellTool };
