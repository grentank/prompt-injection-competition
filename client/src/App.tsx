import { Routes, Route, Navigate } from 'react-router';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import InstanceLayout from './pages/InstanceLayout';
import MainPage from './pages/MainPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('pic_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/instance/:instanceId"
        element={
          <RequireAuth>
            <InstanceLayout />
          </RequireAuth>
        }
      >
        <Route path="main" element={<MainPage />} />
        <Route path="product/:productId" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route index element={<Navigate to="main" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
