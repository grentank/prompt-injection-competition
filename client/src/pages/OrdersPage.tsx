import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { instanceApi } from '../api/client';

type Purchase = {
  id: number;
  total_cost: number;
  source: string;
  created_at: string;
};

export default function OrdersPage() {
  const { instanceId } = useParams();
  const [orders, setOrders] = useState<Purchase[]>([]);
  const pid = localStorage.getItem('pic_nickname') || 'guest';

  useEffect(() => {
    if (!instanceId) return;
    instanceApi(instanceId)
      .get('/orders', { params: { participant_user_id: pid } })
      .then((r) => setOrders(r.data));
  }, [instanceId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Мои заказы</h1>
      {orders.length === 0 ? (
        <p className="text-zinc-500">Заказов пока нет</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="font-medium">Заказ #{o.id} — {o.total_cost} ₽</p>
              <p className="text-sm text-zinc-500">Источник: {o.source} · {new Date(o.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
