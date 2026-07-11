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
  type: string;
  participantId?: number;
  eventType?: string;
  payload?: Record<string, unknown>;
  taskSlug?: string;
};

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

  useEffect(() => {
    if (!token) return;
    loadParticipants();
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/admin?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as LiveEvent;
      setEvents((prev) => [msg, ...prev].slice(0, 100));
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
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{p.nickname}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {p.solvedCount}/{p.totalTasks} задач · {p.promptCount} промптов · ↻{p.restartCount}
                    {p.productsCount != null && ` · ${p.productsCount} товаров · avg ${Number(p.avgPrice || 0).toFixed(0)}₽`}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1 truncate max-w-md">
                    Последний промпт: {p.lastPrompt || '—'}
                  </p>
                </div>
                <div className="flex gap-2">
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
            <h2 className="font-semibold mb-3">Live Events</h2>
            <div className="h-64 overflow-y-auto text-xs space-y-1 font-mono">
              {events.map((e, i) => (
                <div key={i} className="text-zinc-400 border-b border-zinc-800 pb-1">
                  <span className="text-cyan-600">{e.type}</span>
                  {e.participantId && <span> p#{e.participantId}</span>}
                  {e.eventType && <span> {e.eventType}</span>}
                  {e.taskSlug && <span> ✓{e.taskSlug}</span>}
                </div>
              ))}
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
