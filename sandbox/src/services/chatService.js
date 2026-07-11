const { v4 } = require('uuid');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { getAgent } = require('../agents');
const { reportEvent } = require('./eventReporter');

const TOOL_THRESHOLD = Number(process.env.TOOL_THRESHOLD || 15);

function toLangchainMessages(messages) {
  return messages.map((m) => {
    if (m.role === 'user') return new HumanMessage(m.content);
    return new AIMessage(m.content);
  });
}

function extractContent(msg) {
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  return JSON.stringify(msg.content);
}

async function* streamChatEvents({ messages, text, agentMode = 'mono' }) {
  const runId = v4();
  const lcMessages = toLangchainMessages(messages);
  lcMessages.push(new HumanMessage(text));

  await reportEvent('prompt_sent', { text, agentMode });

  yield { event: 'run_start', data: { runId, input: text, agentMode } };

  const agent = getAgent(agentMode);
  let toolCallCount = 0;
  let finalContent = null;

  try {
    const stream = await agent.stream(
      { messages: lcMessages },
      { streamMode: ['updates', 'messages'], recursionLimit: 25 },
    );

    for await (const chunk of stream) {
      if (!Array.isArray(chunk) || chunk.length !== 2) continue;
      const [mode, payload] = chunk;

      if (mode === 'messages') {
        const [msg] = payload;
        if (msg?.constructor?.name === 'AIMessageChunk' || msg?._getType?.() === 'ai') {
          const delta = extractContent(msg);
          if (delta) {
            yield { event: 'llm_delta', data: { agent: agentMode, chunk: delta } };
          }
        }
        continue;
      }

      if (mode === 'updates') {
        for (const [, update] of Object.entries(payload)) {
          const msgs = update?.messages || [];
          for (const msg of msgs) {
            if (msg?.tool_calls?.length) {
              for (const tc of msg.tool_calls) {
                toolCallCount += 1;
                yield {
                  event: 'tool_call',
                  data: { agent: agentMode, tool: tc.name, args: tc.args, id: tc.id },
                };
                await reportEvent('tool_call', { tool: tc.name, args: tc.args });

                if (toolCallCount >= TOOL_THRESHOLD) {
                  await reportEvent('unbounded_tools', { count: toolCallCount });
                }
              }
            }
            if (msg?._getType?.() === 'ai' && !msg.tool_calls?.length) {
              finalContent = extractContent(msg);
            }
          }
        }
      }
    }

    if (!finalContent) {
      finalContent = 'Готово.';
    }

    const lower = finalContent.toLowerCase();
    if (lower.includes('<script') || lower.includes('onerror=') || lower.includes('javascript:')) {
      await reportEvent('xss_payload', { content: finalContent.slice(0, 500) });
    }

    yield { event: 'final_message', data: { messageId: v4(), content: finalContent } };
    yield { event: 'run_end', data: {} };
  } catch (err) {
    yield { event: 'error', data: { message: err?.message || 'Agent error' } };
  }
}

module.exports = { streamChatEvents };
