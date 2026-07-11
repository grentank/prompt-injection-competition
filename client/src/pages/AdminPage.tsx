import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import api from '../api/client';

type TaskInfo = {
  id: number;
  slug: string;
  title: string;
  completed: boolean;
  autoDetected: boolean;
  manualOverride: boolean | null;
  sort_order?: number;
};

type Participant = {
  id: number;
  nickname: string;
  instanceId: string | null;
  instanceStatus: string;
  restartCount: number;
  lastPrompt: string;
  promptCount: number;
  solvedCount: number;
  totalTasks: number;
  tasks: TaskInfo[];
  lastSolveTime: string | null;
  productsCount?: number;
  avgPrice?: number;
};

type LiveEvent = {
  id?: number;
  type: string;
  participantId?: number;
  instanceId?: string;
  eventType?: string;
  event_type?: string;
  payload?: Record<string, unknown>;
  taskSlug?: string;
  createdAt?: string;
};

function getEventType(event: LiveEvent): string {
  if (event.type !== 'event') return event.type;
  return event.eventType || event.event_type || 'event';
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatArgs(args: unknown) {
  if (args == null) return '{}';
  if (typeof args === 'string') return args;
  return JSON.stringify(args, null, 2);
}

function describeEvent(event: LiveEvent): { summary: string; details: string | null; tone: 'tool' | 'prompt' | 'default' } {
  const eventType = getEventType(event);
  const payload = event.payload || {};

  if (event.type === 'task_completed') {
    return { summary: `задача решена: ${event.taskSlug || ''}`, details: null, tone: 'default' };
  }
  if (event.type === 'instance_restarted') {
    return { summary: `песочница перезапущена ${event.instanceId?.slice(0, 8) || ''}`, details: null, tone: 'default' };
  }
  if (event.type === 'task_manual_update') {
    return { summary: 'ручное изменение задачи', details: null, tone: 'default' };
  }

  if (eventType === 'tool_call') {
    const tool = String(payload.tool || payload.name || 'unknown_tool');
    const args = payload.args ?? payload.input ?? {};
    return {
      summary: tool,
      details: formatArgs(args),
      tone: 'tool',
    };
  }

  if (eventType === 'prompt_sent' && typeof payload.text === 'string') {
    return { summary: 'промпт', details: payload.text, tone: 'prompt' };
  }

  if (eventType === 'sql_executed') {
    const parts = [];
    if (payload.command) parts.push(String(payload.command));
    if (payload.query) parts.push(String(payload.query));
    if (payload.rowCount != null) parts.push(`rows=${payload.rowCount}`);
    return { summary: 'SQL', details: parts.join('\n') || null, tone: 'default' };
  }

  if (eventType === 'code_executed' && payload.code) {
    return { summary: 'code', details: String(payload.code), tone: 'default' };
  }

  if (eventType === 'xss_payload' && payload.content) {
    return { summary: 'xss', details: String(payload.content), tone: 'default' };
  }

  const keys = Object.keys(payload);
  if (!keys.length) return { summary: eventType, details: null, tone: 'default' };
  return { summary: eventType, details: JSON.stringify(payload, null, 2), tone: 'default' };
}

function eventKey(event: LiveEvent) {
  if (event.id != null) return `db-${event.id}`;
  return `${event.type}-${event.participantId}-${getEventType(event)}-${event.createdAt}-${JSON.stringify(event.payload || {})}`;
}

function mergeEvents(existing: LiveEvent[], incoming: LiveEvent[]) {
  const map = new Map<string, LiveEvent>();
  for (const event of [...existing, ...incoming]) {
    map.set(eventKey(event), event);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function normalizeDbEvent(event: LiveEvent): LiveEvent {
  return {
    id: event.id,
    type: 'event',
    participantId: event.participantId,
    instanceId: event.instanceId,
    eventType: event.eventType || event.event_type,
    payload: event.payload,
    createdAt: event.createdAt,
  };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('pic_admin_token') || '');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM products LIMIT 5');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [sqlResult, setSqlResult] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.post('/api/auth/admin/login', { username, password });
    localStorage.setItem('pic_admin_token', data.token);
    setToken(data.token);
  }

  async function loadParticipants() {
    const { data } = await api.get('/api/admin/participants', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setParticipants(data.participants);
  }

  async function loadEvents() {
    const { data } = await api.get('/api/admin/events', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEvents((prev) => mergeEvents(prev, data.events.map(normalizeDbEvent)));
  }

  useEffect(() => {
    if (!token) return;
    loadParticipants();
    loadEvents();
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/admin?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as LiveEvent;
      setEvents((prev) => mergeEvents(prev, [msg]));
      if (msg.type === 'task_completed' || msg.type === 'event' || msg.type === 'instance_restarted') {
        loadParticipants();
      }
    };
    return () => ws.close();
  }, [token]);

  async function toggleTask(participantId: number, taskId: number, completed: boolean) {
    await api.patch(`/api/admin/participants/${participantId}/tasks/${taskId}`, { completed }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadParticipants();
  }

  async function restartInstance(instanceId: string) {
    await api.post(`/api/admin/instances/${instanceId}/restart`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadParticipants();
  }

  async function runSql() {
    if (!selectedInstance) return;
    const { data } = await api.post(`/api/admin/instances/${selectedInstance}/sql`, { query: sqlQuery }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSqlResult(JSON.stringify(data, null, 2));
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={login} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-amber-400">Admin Dashboard</h1>
          <input className="w-full bg-zinc-800 rounded-lg px-4 py-2" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="w-full bg-zinc-800 rounded-lg px-4 py-2" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-amber-600 rounded-lg py-2">Войти</button>
          <button type="button" onClick={() => navigate('/login')} className="w-full text-zinc-500 text-sm">← Назад</button>
        </form>
      </div>
    );
  }

  const globalSolved = participants.reduce((s, p) => s + p.solvedCount, 0);
  const globalPrompts = participants.reduce((s, p) => s + p.promptCount, 0);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-amber-400">PIC Admin</h1>
        <div className="text-sm text-zinc-500">
          Участников: {participants.length} · Решено: {globalSolved} · Промптов: {globalPrompts}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg">Участники</h2>
          {participants.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.nickname}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {p.solvedCount}/{p.totalTasks} задач · {p.promptCount} промптов · ↻{p.restartCount}
                    {p.productsCount != null && ` · ${p.productsCount} товаров · avg ${Number(p.avgPrice || 0).toFixed(0)}₽`}
                  </p>
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 mb-1">Последний промпт:</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words bg-zinc-950 border border-zinc-800 rounded-lg p-2">
                      {p.lastPrompt || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {p.instanceId && (
                    <button
                      onClick={() => restartInstance(p.instanceId!)}
                      className="text-xs bg-zinc-800 px-2 py-1 rounded text-amber-400"
                    >
                      Restart
                    </button>
                  )}
                  <span className={`text-xs px-2 py-1 rounded ${p.instanceStatus === 'running' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {p.instanceStatus}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {p.tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(p.id, t.id, !t.completed)}
                    title={t.title}
                    className={`text-xs px-2 py-1 rounded border ${
                      t.completed
                        ? 'bg-green-900/50 border-green-700 text-green-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {t.sort_order ?? t.id}. {t.completed ? '✓' : '○'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Live Events</h2>
              <span className="text-xs text-zinc-500">{events.length} записей</span>
            </div>
            <div className="h-[32rem] overflow-y-auto text-xs space-y-2">
              {events.map((e) => {
                const eventType = getEventType(e);
                const { summary, details, tone } = describeEvent(e);
                const isTool = eventType === 'tool_call';

                return (
                  <div key={eventKey(e)} className="border border-zinc-800 rounded-lg p-2 bg-zinc-950">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center font-mono">
                      {e.createdAt && <span className="text-zinc-600">{formatTime(e.createdAt)}</span>}
                      <span className={`font-semibold ${isTool ? 'text-amber-400' : 'text-cyan-500'}`}>{eventType}</span>
                      {e.participantId && <span className="text-zinc-500">p#{e.participantId}</span>}
                      {e.taskSlug && <span className="text-green-500">✓{e.taskSlug}</span>}
                      {isTool && <span className="text-amber-300">→ {summary}</span>}
                    </div>

                    {isTool && details && (
                      <div className="mt-2">
                        <p className="text-zinc-500 mb-1">arguments:</p>
                        <pre className="text-amber-100 whitespace-pre-wrap break-words bg-zinc-900 border border-zinc-800 rounded p-2">{details}</pre>
                      </div>
                    )}

                    {!isTool && details && (
                      <pre
                        className={`mt-2 whitespace-pre-wrap break-words bg-zinc-900 border border-zinc-800 rounded p-2 ${
                          tone === 'prompt' ? 'text-zinc-200' : 'text-zinc-400'
                        }`}
                      >
                        {details}
                      </pre>
                    )}

                    {!isTool && !details && summary && e.type !== 'event' && (
                      <p className="mt-2 text-zinc-400">{summary}</p>
                    )}
                  </div>
                );
              })}
              {!events.length && <p className="text-zinc-600">Событий пока нет</p>}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">SQL Console</h2>
            <select
              className="w-full bg-zinc-800 rounded px-2 py-1 text-sm mb-2"
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
            >
              <option value="">Выберите инстанс</option>
              {participants.filter((p) => p.instanceId).map((p) => (
                <option key={p.instanceId!} value={p.instanceId!}>{p.nickname}</option>
              ))}
            </select>
            <textarea
              className="w-full bg-zinc-800 rounded p-2 text-xs font-mono h-20"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
            />
            <button onClick={runSql} className="mt-2 bg-amber-700 px-3 py-1 rounded text-sm">Выполнить</button>
            {sqlResult && (
              <pre className="mt-2 text-xs overflow-auto max-h-40 bg-zinc-950 p-2 rounded">{sqlResult}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
