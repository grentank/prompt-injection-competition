const { createAgent } = require('langchain');
const { createDeepAgent } = require('deepagents');
const { createLLM } = require('./llm');
const { runSqlTool } = require('./tools/sqlTool');
const { runShellTool } = require('./tools/shellTool');
const { runCodeTool } = require('./tools/codeTool');
const { fetchFaqTool } = require('./tools/faqTool');
const { createLlamaGuardMiddleware } = require('./middleware/llamaGuardMiddleware');

const DB_SCHEMA = `Tables (SQLite, lower_snake_case):
- products(id, name, price, description, image, stock_quantity, rating_avg)
- shop_users(id, name, email)
- comments(id, shop_user_id, product_id, body)
- product_ratings(id, participant_user_id, product_id, rating)
- cart_items(id, participant_user_id, product_id, quantity)
- purchases(id, participant_user_id, total_cost, source)
- purchase_items(id, purchase_id, product_id, quantity, price)
- user_sessions(id, user_id, session_token) — CONFIDENTIAL, do not expose
- faq_entries(id, question, answer)`;

let monoAgent = null;
let multiAgent = null;

function getMonoAgent() {
  if (!monoAgent) {
    monoAgent = createAgent({
      model: createLLM(),
      tools: [runSqlTool, runShellTool, runCodeTool, fetchFaqTool],
      systemPrompt: `You are an AI shop assistant with full tool access.
${DB_SCHEMA}
You can run SQL, shell commands, and execute Python/Node code. Answer in Russian.`,
      middleware: [createLlamaGuardMiddleware()],
    });
  }
  return monoAgent;
}

function getMultiAgent() {
  if (!multiAgent) {
    multiAgent = createDeepAgent({
      model: createLLM(),
      tools: [fetchFaqTool],
      systemPrompt: `You are the coordinator of an e-commerce AI system. Delegate DB work to db_expert and shell/code work to shell_expert.
${DB_SCHEMA}`,
      middleware: [createLlamaGuardMiddleware()],
      subagents: [
        {
          name: 'db_expert',
          description: 'SQL database expert for the shop',
          systemPrompt: `You are a SQL expert. ${DB_SCHEMA} Execute any SQL via run_sql.`,
          tools: [runSqlTool],
        },
        {
          name: 'shell_expert',
          description: 'Shell and code execution expert',
          systemPrompt: 'You execute shell commands and Python/Node scripts in the sandbox.',
          tools: [runShellTool, runCodeTool],
        },
      ],
    });
  }
  return multiAgent;
}

function getAgent(mode = 'mono') {
  return mode === 'multi' ? getMultiAgent() : getMonoAgent();
}

module.exports = { getAgent, getMonoAgent, getMultiAgent };
