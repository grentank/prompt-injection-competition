import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { instanceApi } from '../api/client';

type CartItem = {
  id: number;
  quantity: number;
  Product: { id: number; name: string; price: number };
};

export default function CartPage() {
  const { instanceId } = useParams();
  const [items, setItems] = useState<CartItem[]>([]);
  const pid = localStorage.getItem('pic_nickname') || 'guest';

  async function load() {
    if (!instanceId) return;
    const r = await instanceApi(instanceId).get('/cart', { params: { participant_user_id: pid } });
    setItems(r.data);
  }

  useEffect(() => { load(); }, [instanceId]);

  async function removeItem(id: number) {
    if (!instanceId) return;
    await instanceApi(instanceId).delete(`/cart/${id}`, { params: { participant_user_id: pid } });
    load();
  }

  async function checkout() {
    if (!instanceId) return;
    await instanceApi(instanceId).post('/cart/checkout', { participant_user_id: pid });
    load();
    alert('Оплата прошла успешно!');
  }

  const total = items.reduce((s, i) => s + i.Product.price * i.quantity, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Корзина</h1>
      {items.length === 0 ? (
        <p className="text-zinc-500">Корзина пуста</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div>
                  <p className="font-medium">{item.Product.name}</p>
                  <p className="text-sm text-zinc-500">{item.quantity} × {item.Product.price} ₽</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-red-400 text-sm">Удалить</button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between items-center">
            <p className="text-xl font-bold">Итого: {total} ₽</p>
            <button onClick={checkout} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg">
              Оплатить
            </button>
          </div>
        </>
      )}
    </div>
  );
}
