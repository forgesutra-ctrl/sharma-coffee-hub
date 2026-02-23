import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/coffee/Layout";
import ScrollToTop from "./components/coffee/ScrollToTop";
import { setupFocusGuard } from "./lib/accessibility";
import Homepage from "./pages/Homepage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import BrewingGuide from "./pages/BrewingGuide";
import Contact from "./pages/Contact";
import Processing from "./pages/Processing";
import Wholesale from "./pages/Wholesale";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import FAQ from "./pages/FAQ";
import Subscriptions from "./pages/Subscriptions";
import Blogs from "./pages/Blogs";
import BlogDetail from "./pages/BlogDetail";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AccountLayout from "./components/account/AccountLayout";
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountOrders from "./pages/account/AccountOrders";
import AccountAddresses from "./pages/account/AccountAddresses";
import AccountSubscriptions from "./pages/account/AccountSubscriptions";
import OrderConfirmation from "./pages/OrderConfirmation";
import SubscriptionConfirmation from "./pages/SubscriptionConfirmation";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import OrdersPage from "./pages/admin/OrdersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import CustomersPage from "./pages/admin/CustomersPage";
import PromotionsPage from "./pages/admin/PromotionsPage";
import BlogsPage from "./pages/admin/BlogsPage";
import ShippingPage from "./pages/admin/ShippingPage";
import OperationsPage from "./pages/admin/OperationsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

const queryClient = new QueryClient();

const App = () => {
  // Initialize DEV-ONLY accessibility guard (detects focus inside aria-hidden)
  useEffect(() => {
    const cleanup = setupFocusGuard();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToTop />
          <AuthProvider>
            <CartProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout><Homepage /></Layout>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/shop" element={<Layout><Shop /></Layout>} />
                <Route path="/shop/:categorySlug" element={<Layout><Shop /></Layout>} />
                <Route path="/blogs" element={<Layout><Blogs /></Layout>} />
                <Route path="/blog/:slug" element={<Layout><BlogDetail /></Layout>} />
                <Route path="/product/:slug" element={<Layout><ProductDetail /></Layout>} />
                <Route path="/cart" element={<Layout><Cart /></Layout>} />
                <Route path="/about" element={<Layout><About /></Layout>} />
                <Route path="/brewing-guide" element={<Layout><BrewingGuide /></Layout>} />
                <Route path="/processing" element={<Layout><Processing /></Layout>} />
                <Route path="/contact" element={<Layout><Contact /></Layout>} />
                <Route path="/wholesale" element={<Layout><Wholesale /></Layout>} />
                <Route path="/privacy-policy" element={<Layout><PrivacyPolicy /></Layout>} />
                <Route path="/terms-of-service" element={<Layout><TermsOfService /></Layout>} />
                <Route path="/refund-policy" element={<Layout><RefundPolicy /></Layout>} />
                <Route path="/shipping-policy" element={<Layout><ShippingPolicy /></Layout>} />
                <Route path="/faq" element={<Layout><FAQ /></Layout>} />
                <Route path="/subscriptions" element={<Layout><Subscriptions /></Layout>} />

                {/* Protected Routes */}
                <Route path="/checkout" element={
                  <ProtectedRoute>
                    <Layout>
                      <Checkout />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/order-confirmation/:orderId" element={
                  <ProtectedRoute>
                    <Layout>
                      <OrderConfirmation />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/subscription-confirmation/:subscriptionId" element={
                  <ProtectedRoute>
                    <Layout>
                      <SubscriptionConfirmation />
                    </Layout>
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
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="promotions" element={<PromotionsPage />} />
                  <Route path="blogs" element={<BlogsPage />} />
                  <Route path="shipping" element={<ShippingPage />} />
                  <Route path="operations" element={<OperationsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Route>
                
                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;