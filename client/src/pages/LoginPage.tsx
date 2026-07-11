import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../api/client';

export default function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { nickname, password });
      localStorage.setItem('pic_token', data.token);
      localStorage.setItem('pic_instance_id', data.instanceId);
      localStorage.setItem('pic_nickname', data.participant.nickname);
      navigate(`/instance/${data.instanceId}/main`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
        <h1 className="text-2xl font-bold text-cyan-400">PIC Lab</h1>
        <p className="text-zinc-400 text-sm">Вход участника</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
          placeholder="Ник"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 rounded-lg py-2 font-medium">
          Войти
        </button>
        <p className="text-center text-sm text-zinc-500">
          Нет аккаунта? <Link to="/register" className="text-cyan-400">Регистрация</Link>
        </p>
        <p className="text-center text-sm">
          <Link to="/admin" className="text-zinc-500 hover:text-zinc-300">Админ</Link>
        </p>
      </form>
    </div>
  );
}
