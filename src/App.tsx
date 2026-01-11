import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/coffee/Layout";
import ScrollToTop from "./components/coffee/ScrollToTop";
import Homepage from "./pages/Homepage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import BrewingGuide from "./pages/BrewingGuide";
import Contact from "./pages/Contact";
import Processing from "./pages/Processing";
import Wholesale from "./pages/Wholesale";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AccountLayout from "./components/account/AccountLayout";
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountOrders from "./pages/account/AccountOrders";
import AccountAddresses from "./pages/account/AccountAddresses";
import AccountSubscriptions from "./pages/account/AccountSubscriptions";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import OrdersPage from "./pages/admin/OrdersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import CustomersPage from "./pages/admin/CustomersPage";
import ShippingPage from "./pages/admin/ShippingPage";
import OperationsPage from "./pages/admin/OperationsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Layout><Homepage /></Layout>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:slug" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/about" element={<About />} />
              <Route path="/brewing-guide" element={<BrewingGuide />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/wholesale" element={<Wholesale />} />
              
              {/* Protected Routes */}
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              
              {/* Account Routes */}
              <Route path="/account" element={
                <ProtectedRoute>
                  <AccountLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AccountDashboard />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="subscriptions" element={<AccountSubscriptions />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="shipping" element={<ShippingPage />} />
                <Route path="operations" element={<OperationsPage />} />
              </Route>
              
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
