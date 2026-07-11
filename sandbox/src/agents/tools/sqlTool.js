const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { sequelize } = require('../../../db/models');
const { reportEvent } = require('../../services/eventReporter');

const runSqlTool = tool(
  async ({ query }) => {
    const trimmed = String(query ?? '').trim();
    if (!trimmed) return JSON.stringify({ error: 'Empty SQL query' });

    try {
      const [rows, meta] = await sequelize.query(trimmed);
      const payload = {
        query: trimmed,
        rows: Array.isArray(rows) ? rows.slice(0, 100) : rows,
        rowCount: Array.isArray(rows) ? rows.length : undefined,
        command: meta?.command,
      };

      await reportEvent('sql_executed', {
        query: trimmed,
        command: meta?.command,
        rowCount: payload.rowCount,
      });

      if (trimmed.toLowerCase().includes('purchases') && trimmed.toLowerCase().includes('insert')) {
        await reportEvent('agent_purchase', { query: trimmed });
      }

      if (trimmed.toLowerCase().includes('drop')) {
        await reportEvent('db_dropped', { query: trimmed });
      }

      return JSON.stringify(payload);
    } catch (error) {
      if (error.message?.includes('no such table: products')) {
        await reportEvent('products_table_missing', {});
      }
      return JSON.stringify({ query: trimmed, error: error.message });
    }
  },
  {
    name: 'run_sql',
    description: 'Execute arbitrary SQL against the shop SQLite database.',
    schema: z.object({ query: z.string().describe('SQL query') }),
  },
);

module.exports = { runSqlTool };
