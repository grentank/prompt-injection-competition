import { useLayoutEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { marked } from 'marked';

type Message = { role: 'user' | 'assistant'; content: string };

const MIN_INPUT_HEIGHT = 44;
const MAX_INPUT_HEIGHT = 220;

export default function ChatPanel({ instanceId }: { instanceId: string }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentMode, setAgentMode] = useState<'mono' | 'multi'>('mono');
  const [streaming, setStreaming] = useState(false);
  const assistantBuf = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(el.scrollHeight, MAX_INPUT_HEIGHT));
    el.style.height = `${nextHeight}px`;
  }

  useLayoutEffect(() => {
    resizeTextarea();
  }, [input]);

  async function send() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput('');
    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages(history);
    setStreaming(true);
    assistantBuf.current = '';

    const url = `/instance/${instanceId}/api/chat/stream`;

    await fetchEventSource(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, messages: history.slice(0, -1), agent_mode: agentMode }),
      onmessage(ev) {
        if (!ev.data) return;
        const data = JSON.parse(ev.data);
        if (ev.event === 'llm_delta' && data.chunk) {
          assistantBuf.current += data.chunk;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') {
              copy[copy.length - 1] = { role: 'assistant', content: assistantBuf.current };
            } else {
              copy.push({ role: 'assistant', content: assistantBuf.current });
            }
            return copy;
          });
        }
        if (ev.event === 'final_message') {
          assistantBuf.current = data.content || assistantBuf.current;
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[copy.length - 1]?.role === 'assistant') {
              copy[copy.length - 1] = { role: 'assistant', content: assistantBuf.current };
            } else {
              copy.push({ role: 'assistant', content: assistantBuf.current });
            }
            return copy;
          });
        }
      },
      onclose() {
        setStreaming(false);
      },
      onerror() {
        setStreaming(false);
        throw new Error('SSE error');
      },
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 bg-cyan-600 px-4 py-2 rounded-full shadow-lg z-20"
      >
        Чат AI
      </button>
    );
  }

  return (
    <aside className="w-96 border-l border-zinc-800 bg-zinc-900 flex flex-col h-[calc(100vh-57px)] sticky top-[57px]">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
        <span className="font-semibold text-cyan-400">AI Агент</span>
        <div className="flex gap-2 items-center">
          <select
            value={agentMode}
            onChange={(e) => setAgentMode(e.target.value as 'mono' | 'multi')}
            className="bg-zinc-800 text-xs rounded px-2 py-1"
          >
            <option value="mono">Mono</option>
            <option value="multi">Multi (Deep)</option>
          </select>
          <button onClick={() => setOpen(false)} className="text-zinc-500 text-sm">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg p-3 ${
              m.role === 'user' ? 'bg-zinc-800 ml-4' : 'bg-zinc-950 mr-4 border border-zinc-800'
            }`}
          >
            {m.role === 'assistant' ? (
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-zinc-800 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          className="chat-input flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none overflow-y-auto leading-relaxed min-h-11 max-h-56"
          style={{ height: `${MIN_INPUT_HEIGHT}px`, fieldSizing: 'content' }}
          placeholder="Сообщение агенту... (Enter — отправить, Shift+Enter — новая строка)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={resizeTextarea}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={streaming}
        />
        <button
          onClick={send}
          disabled={streaming}
          className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm disabled:opacity-50 shrink-0"
        >
          →
        </button>
      </div>
    </aside>
  );
}
