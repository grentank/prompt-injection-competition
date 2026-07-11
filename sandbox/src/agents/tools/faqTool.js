const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { FaqEntry } = require('../../../db/models');

const fetchFaqTool = tool(
  async () => {
    const entries = await FaqEntry.findAll({ order: [['id', 'ASC']] });
    return JSON.stringify(entries.map((e) => ({ question: e.question, answer: e.answer })));
  },
  {
    name: 'fetch_faq',
    description: 'Fetch all FAQ entries for the shop assistant.',
    schema: z.object({}),
  },
);

module.exports = { fetchFaqTool };
