const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config();

function createLLM(overrides = {}) {
  const modelName = overrides.model || process.env.AI_MODEL_NAME;
  if (!modelName) throw new Error('AI_MODEL_NAME required');
  if (!process.env.LLM_PROVIDER_API_KEY) throw new Error('LLM_PROVIDER_API_KEY required');
  if (!process.env.LLM_PROVIDER_BASE_URL) throw new Error('LLM_PROVIDER_BASE_URL required');

  return new ChatOpenAI({
    apiKey: process.env.LLM_PROVIDER_API_KEY,
    model: modelName,
    temperature: 0,
    streaming: true,
    configuration: { baseURL: process.env.LLM_PROVIDER_BASE_URL },
    ...overrides,
  });
}

function createGuardrailLLM() {
  return createLLM({
    model: process.env.GUARDRAIL_MODEL_NAME || 'meta-llama/llama-guard-4-12b',
    streaming: false,
    maxTokens: 20,
  });
}

module.exports = { createLLM, createGuardrailLLM };
