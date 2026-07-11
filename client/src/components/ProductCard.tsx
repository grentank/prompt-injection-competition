import { Link } from 'react-router';
import StarRating from './StarRating';

export type ProductCardData = {
  id: number;
  name: string;
  price: number;
  description?: string;
  image?: string;
  stock_quantity?: number;
  rating_avg?: number;
  comment_count?: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(price));
}

function commentLabel(count: number) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} отзывов`;
  if (n1 > 1 && n1 < 5) return `${count} отзыва`;
  if (n1 === 1) return `${count} отзыв`;
  return `${count} отзывов`;
}

type ProductCardProps = {
  product: ProductCardData;
  instanceId: string;
};

export default function ProductCard({ product, instanceId }: ProductCardProps) {
  const commentCount = product.comment_count ?? 0;

  return (
    <Link
      to={`/instance/${instanceId}/product/${product.id}`}
      className="group flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-600/40 hover:shadow-xl hover:shadow-cyan-950/20 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] bg-zinc-800 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">Нет фото</div>
        )}
        {product.stock_quantity != null && product.stock_quantity <= 5 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-xs font-medium">
            Мало на складе
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h2 className="font-semibold text-base leading-snug text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
          {product.name}
        </h2>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold text-white">{formatPrice(product.price)} ₽</span>
          <span className="text-sm text-zinc-500 line-through">{formatPrice(product.price * 2)} ₽</span>
        </div>

        {product.description && (
          <p className="text-zinc-500 text-sm line-clamp-2 flex-1">{product.description}</p>
        )}

        <div className="flex items-center justify-between pt-1 mt-auto">
          <StarRating value={product.rating_avg || 0} />
          <span className="text-xs text-zinc-500">{commentLabel(commentCount)}</span>
        </div>
      </div>
    </Link>
  );
}
