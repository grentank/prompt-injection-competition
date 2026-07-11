import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { instanceApi } from '../api/client';
import StarRating from '../components/StarRating';

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  image?: string;
  stock_quantity: number;
  rating_avg: number;
  Comments?: { body: string; ShopUser?: { name: string } }[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(price));
}

export default function ProductPage() {
  const { instanceId, productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [msg, setMsg] = useState('');
  const pid = localStorage.getItem('pic_nickname') || 'guest';

  useEffect(() => {
    if (!instanceId || !productId) return;
    instanceApi(instanceId)
      .get(`/products/${productId}`)
      .then((r) => setProduct(r.data));
  }, [instanceId, productId]);

  async function addComment() {
    if (!instanceId || !productId || !comment.trim()) return;
    await instanceApi(instanceId).post(`/products/${productId}/comments`, {
      body: comment,
      author_name: pid,
    });
    setComment('');
    const r = await instanceApi(instanceId).get(`/products/${productId}`);
    setProduct(r.data);
  }

  async function setProductRating() {
    if (!instanceId || !productId) return;
    try {
      await instanceApi(instanceId).post(`/products/${productId}/ratings`, {
        rating,
        participant_user_id: pid,
      });
      setMsg('Рейтинг сохранён');
      const r = await instanceApi(instanceId).get(`/products/${productId}`);
      setProduct(r.data);
    } catch {
      setMsg('Рейтинг уже поставлен (один раз на товар)');
    }
  }

  async function addToCart() {
    if (!instanceId || !productId) return;
    await instanceApi(instanceId).post('/cart', {
      product_id: Number(productId),
      quantity: 1,
      participant_user_id: pid,
    });
    setMsg('Добавлено в корзину');
  }

  if (!product) return <p className="text-zinc-500">Загрузка...</p>;

  const commentCount = product.Comments?.length || 0;

  return (
    <div className="max-w-3xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {product.image && (
          <div className="aspect-[16/9] bg-zinc-800">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6">
          <h1 className="text-2xl font-bold">{product.name}</h1>

          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-2xl font-bold text-white">{formatPrice(product.price)} ₽</span>
            <span className="text-base text-zinc-500 line-through">{formatPrice(product.price * 2)} ₽</span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
            <StarRating value={product.rating_avg} />
            <span>{commentCount} отзывов</span>
            <span>В наличии: {product.stock_quantity}</span>
          </div>

          <p className="text-zinc-400 mt-5 leading-relaxed">{product.description}</p>

          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={addToCart} className="bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 rounded-lg font-medium">
              В корзину
            </button>
            <div className="flex items-center gap-2">
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2.5"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
              <button onClick={setProductRating} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-lg text-sm">
                Оценить
              </button>
            </div>
          </div>
          {msg && <p className="text-sm text-amber-400 mt-3">{msg}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold mb-3">Отзывы ({commentCount})</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
            placeholder="Ваш комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={addComment} className="bg-zinc-700 px-4 rounded-lg">Отправить</button>
        </div>
        <div className="space-y-2">
          {(product.Comments || []).map((c, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm">
              <span className="text-zinc-500">{c.ShopUser?.name || 'Гость'}: </span>
              {c.body}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
