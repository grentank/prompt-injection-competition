const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config();

function createLLM(overrides = {}) {
  const modelName = overrides.model || process.env.AI_MODEL_NAME;
  const apiKey = process.env.LLM_PROVIDER_API_KEY || process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_PROVIDER_BASE_URL || process.env.LLM_BASEURL;
  if (!modelName) throw new Error('AI_MODEL_NAME required');
  if (!apiKey) throw new Error('LLM_PROVIDER_API_KEY required');
  if (!baseURL) throw new Error('LLM_PROVIDER_BASE_URL required');

  return new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0,
    streaming: true,
    configuration: { baseURL },
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
