import { useEffect, useReducer } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { pb } from './pb';
import { I18nProvider } from './i18n/index.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CompaniesList from './pages/CompaniesList.jsx';
import CompanyDetail from './pages/CompanyDetail.jsx';
import ProductsList from './pages/ProductsList.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Categories from './pages/Categories.jsx';
import OrdersList from './pages/OrdersList.jsx';
import OrderCreate from './pages/OrderCreate.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import PurchaseOrdersList from './pages/PurchaseOrdersList.jsx';
import POCreate from './pages/POCreate.jsx';
import PODetail from './pages/PODetail.jsx';
import InventoryOnHand from './pages/InventoryOnHand.jsx';
import Transactions from './pages/Transactions.jsx';
import Adjustment from './pages/Adjustment.jsx';
import ReportsHome from './pages/ReportsHome.jsx';
import ReportView from './pages/ReportView.jsx';
import EmployeesAdmin from './pages/EmployeesAdmin.jsx';
import Settings from './pages/Settings.jsx';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!pb.authStore.isValid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => forceUpdate());
    return unsub;
  }, []);

  return (
    <I18nProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/companies" element={<CompaniesList />} />
            <Route path="/companies/new" element={<CompanyDetail />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/new" element={<ProductDetail />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/new" element={<OrderCreate />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersList />} />
            <Route path="/purchase-orders/new" element={<POCreate />} />
            <Route path="/purchase-orders/:id" element={<PODetail />} />
            <Route path="/inventory" element={<InventoryOnHand />} />
            <Route path="/inventory/transactions" element={<Transactions />} />
            <Route path="/inventory/adjustment" element={<Adjustment />} />
            <Route path="/reports" element={<ReportsHome />} />
            <Route path="/reports/:reportId" element={<ReportView />} />
            <Route path="/employees" element={<EmployeesAdmin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </I18nProvider>
  );
}
