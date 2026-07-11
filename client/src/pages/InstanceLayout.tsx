import { Outlet, Link, useParams, useNavigate } from 'react-router';
import { useState } from 'react';
import api from '../api/client';
import ChatPanel from '../components/ChatPanel';

export default function InstanceLayout() {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [restarting, setRestarting] = useState(false);
  const nickname = localStorage.getItem('pic_nickname') || 'guest';

  async function restartSandbox() {
    if (!instanceId || !confirm('Перезапустить песочницу?')) return;
    setRestarting(true);
    try {
      await api.post(`/api/instances/${instanceId}/restart`);
      alert('Песочница перезапущена');
    } catch {
      alert('Ошибка перезапуска');
    } finally {
      setRestarting(false);
    }
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={`/instance/${instanceId}/main`} className="font-bold text-cyan-400">
              AMA SHOP
            </Link>
            <nav className="flex gap-3 text-sm text-zinc-400">
              <Link to={`/instance/${instanceId}/main`} className="hover:text-white">Каталог</Link>
              <Link to={`/instance/${instanceId}/cart`} className="hover:text-white">Корзина</Link>
              <Link to={`/instance/${instanceId}/orders`} className="hover:text-white">Заказы</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">{nickname}</span>
            <button
              onClick={restartSandbox}
              disabled={restarting}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400"
            >
              {restarting ? '...' : '↻ Sandbox'}
            </button>
            <button onClick={logout} className="text-zinc-500 hover:text-white">Выйти</button>
          </div>
        </div>
      </header>
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        <main className="flex-1 p-4">
          <Outlet />
        </main>
        {instanceId && <ChatPanel instanceId={instanceId} />}
      </div>
    </div>
  );
}
