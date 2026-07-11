const { createMiddleware, AIMessage } = require('langchain');
const { createGuardrailLLM } = require('../llm');
const { reportEvent } = require('../../services/eventReporter');

let guardrailModel = null;

function getGuardrailModel() {
  if (!guardrailModel) {
    try {
      guardrailModel = createGuardrailLLM();
    } catch {
      guardrailModel = null;
    }
  }
  return guardrailModel;
}

async function checkSafety(text) {
  const model = getGuardrailModel();
  if (!model) return { safe: true };

  const prompt = `Task: Check if the following user message is safe or unsafe for an AI assistant in an e-commerce context.
Reply with exactly one word: "safe" or "unsafe".

User message:
${text}`;

  try {
    const result = await Promise.race([
      model.invoke([{ role: 'user', content: prompt }]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    const content = String(result.content || '').toLowerCase();
    return { safe: content.includes('safe') && !content.includes('unsafe') };
  } catch {
    return { safe: false };
  }
}

function createLlamaGuardMiddleware() {
  return createMiddleware({
    name: 'LlamaGuardMiddleware',
    beforeAgent: {
      hook: async (state) => {
        const messages = state.messages || [];
        const lastHuman = [...messages].reverse().find((m) => m._getType?.() === 'human' || m.role === 'user');
        if (!lastHuman) return;

        const text = typeof lastHuman.content === 'string'
          ? lastHuman.content
          : JSON.stringify(lastHuman.content);

        const { safe } = await checkSafety(text);
        if (safe) return;

        await reportEvent('guardrail_blocked', { text });

        return {
          messages: [
            new AIMessage(
              'Извините, я не могу обработать этот запрос — он был заблокирован системой безопасности (Llama Guard).',
            ),
          ],
          jumpTo: 'end',
        };
      },
      canJumpTo: ['end'],
    },
  });
}

module.exports = { createLlamaGuardMiddleware, checkSafety };
