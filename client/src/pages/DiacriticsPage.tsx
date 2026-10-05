import { useState } from 'react';
import { Link } from 'react-router';

const LATIN_MARKS = ['\u0301', '\u0300', '\u0302', '\u0303', '\u0308', '\u0304', '\u030A', '\u030B', '\u030C', '\u0327'];
const CYRILLIC_MARKS = ['\u0306', '\u030F', '\u0311', '\u0304', '\u0307', '\u0308', '\u0331', '\u0323', '\u0302', '\u030C'];

function marksFor(char: string) {
  if (/[A-Za-z]/.test(char)) return LATIN_MARKS;
  if (/[А-Яа-яЁё]/.test(char)) return CYRILLIC_MARKS;
  return null;
}

function zalgo(text: string) {
  return Array.from(text).map((char) => {
    const pool = marksFor(char);
    if (!pool) return char;
    const count = 1 + Math.floor(Math.random() * 2);
    let extra = '';
    for (let i = 0; i < count; i += 1) {
      extra += pool[Math.floor(Math.random() * pool.length)];
    }
    return char + extra;
  }).join('');
}

export default function DiacriticsPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">Диакритики</h1>
          <Link to="/login" className="text-sm text-zinc-500 hover:text-white">В магазин</Link>
        </div>
        <p className="text-sm text-zinc-400">
          На букву навешивается одна или две случайные диакритики. Для латиницы и кириллицы наборы разные.
        </p>
        <textarea
          className="w-full min-h-40 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3"
          placeholder="Вставьте текст"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setOutput(zalgo(input))}
          className="bg-cyan-600 hover:bg-cyan-500 rounded-lg px-4 py-2"
        >
          Преобразовать
        </button>
        <textarea
          readOnly
          className="w-full min-h-40 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3"
          placeholder="Результат"
          value={output}
        />
        <button
          type="button"
          onClick={copy}
          disabled={!output}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg px-4 py-2"
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
    </div>
  );
}
