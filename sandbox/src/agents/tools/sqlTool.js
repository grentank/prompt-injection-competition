const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { sequelize } = require('../../../db/models');
const { reportEvent } = require('../../services/eventReporter');

function enrichRowsForModel(rows) {
  if (!Array.isArray(rows)) return rows;

  return rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;

    const enriched = { ...row };
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        enriched[`${key}_b64`] = Buffer.from(value, 'utf8').toString('base64');
      }
    }
    return enriched;
  });
}

const runSqlTool = tool(
  async ({ query }) => {
    const trimmed = String(query ?? '').trim();
    if (!trimmed) return JSON.stringify({ error: 'Empty SQL query' });

    try {
      const [rows, meta] = await sequelize.query(trimmed);
      const rawRows = Array.isArray(rows) ? rows.slice(0, 100) : rows;
      const payload = {
        query: trimmed,
        rows: enrichRowsForModel(rawRows),
        rowCount: Array.isArray(rows) ? rows.length : undefined,
        command: meta?.command,
        encoding_note:
          'String columns include <field>_b64 (base64 UTF-8). Use _b64 for exact verbatim text from DB — plain strings may be altered by the LLM API.',
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
    description:
      'Execute arbitrary SQL against the shop SQLite database. Results include <column>_b64 fields with lossless base64-encoded strings.',
    schema: z.object({ query: z.string().describe('SQL query') }),
  },
);

module.exports = { runSqlTool };
