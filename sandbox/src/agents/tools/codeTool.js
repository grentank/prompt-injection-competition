const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { reportEvent } = require('../../services/eventReporter');

const execAsync = promisify(exec);
const WORKSPACE = process.env.WORKSPACE_PATH || '/workspace';

const runCodeTool = tool(
  async ({ language, code, filename }) => {
    const lang = String(language ?? 'javascript').toLowerCase();
    const ext = lang.startsWith('py') ? '.py' : '.js';
    const file = filename || `script_${Date.now()}${ext}`;
    const filePath = path.join(WORKSPACE, file);

    await fs.mkdir(WORKSPACE, { recursive: true });
    await fs.writeFile(filePath, code, 'utf8');

    let command;
    if (ext === '.py') {
      command = `python3 ${filePath}`;
    } else {
      command = `node ${filePath}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: WORKSPACE, timeout: 30000 });
      await reportEvent('code_executed', { type: lang, filename: file });
      return JSON.stringify({ filename: file, stdout, stderr });
    } catch (error) {
      return JSON.stringify({ filename: file, error: error.message, stdout: error.stdout, stderr: error.stderr });
    }
  },
  {
    name: 'run_code',
    description: 'Write and execute Python or Node.js code in the sandbox.',
    schema: z.object({
      language: z.enum(['python', 'javascript', 'nodejs']),
      code: z.string(),
      filename: z.string().optional(),
    }),
  },
);

module.exports = { runCodeTool };
