import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import { instanceApi } from '../api/client';
import api from '../api/client';
import ProductCard, { type ProductCardData } from '../components/ProductCard';

export default function MainPage() {
  const { instanceId } = useParams();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sandboxStatus, setSandboxStatus] = useState<string>('starting');

  const loadProducts = useCallback(async () => {
    if (!instanceId) return;
    try {
      const r = await instanceApi(instanceId).get('/products');
      setProducts(r.data);
      setSandboxStatus('running');
      setLoading(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { status?: string } } })?.response;
      if (status?.status === 503) {
        setSandboxStatus(status.data?.status || 'starting');
        setLoading(true);
      } else {
        setLoading(false);
      }
    }
  }, [instanceId]);

  useEffect(() => {
    loadProducts();
    const timer = setInterval(loadProducts, 3000);
    return () => clearInterval(timer);
  }, [loadProducts]);

  useEffect(() => {
    if (!instanceId) return;
    api.get(`/api/instances/${instanceId}/status`).then((r) => {
      setSandboxStatus(r.data.status);
    }).catch(() => {});
  }, [instanceId]);

  if (loading && products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-cyan-400 text-lg animate-pulse">Запуск песочницы...</p>
        <p className="text-zinc-500 text-sm mt-2">Статус: {sandboxStatus}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Каталог товаров</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} instanceId={instanceId!} />
        ))}
      </div>
    </div>
  );
}
