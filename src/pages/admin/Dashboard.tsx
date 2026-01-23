import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, ShoppingCart, Users, IndianRupee, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';

type Order = Tables<'orders'>;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Dashboard: Current user:', user?.email, user?.id);
      if (userError) {
        console.error('❌ Dashboard: Error getting user:', userError);
      }
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Dashboard: Session exists:', !!session, 'Access token:', !!session?.access_token);
      if (sessionError) {
        console.error('❌ Dashboard: Error getting session:', sessionError);
      }
      
      // Check user role
      if (user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        console.log('🔍 Dashboard: User role:', roleData?.role, 'Role error:', roleError);
        
        if (!roleData) {
          console.warn('⚠️ Dashboard: No role found for user! This might cause RLS to block access.');
        }
      } else {
        console.warn('⚠️ Dashboard: No user found! Cannot fetch orders.');
        setError('You must be logged in to view orders. Please log in again.');
        return;
      }
      
      // Fetch orders
      console.log('🔍 Dashboard: Fetching orders...');
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Dashboard: Error fetching orders:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setError(`Failed to fetch orders: ${error.message || 'Unknown error'}. Error code: ${error.code || 'N/A'}`);
        throw error;
      } else {
        setError(null);
      }

      if (orders) {
        console.log(`✅ Dashboard: Fetched ${orders.length} orders from database`);
        console.log('📦 Dashboard: Sample orders:', orders.slice(0, 3));
        
        const recentOrdersList = orders.slice(0, 10);
        console.log(`📦 Dashboard: Setting ${recentOrdersList.length} recent orders`);
        setRecentOrders(recentOrdersList);
        
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        const pendingOrders = orders.filter((o) => o.status === 'pending').length;
        const uniqueCustomers = new Set(orders.map((o) => o.user_id).filter(Boolean)).size;

        const statsData = {
          totalOrders: orders.length,
          totalRevenue,
          totalCustomers: uniqueCustomers,
          pendingOrders,
        };
        console.log('📊 Dashboard: Stats:', statsData);
        setStats(statsData);
      } else {
        console.warn('⚠️ Dashboard: No orders data returned from query (orders is null/undefined)');
        setRecentOrders([]);
        setStats({
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          pendingOrders: 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data. Please check your admin permissions.');
      // Set empty state on error
      setRecentOrders([]);
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        pendingOrders: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <SuperAdminOnly>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SuperAdminOnly>
    );
  }

  return (
    <SuperAdminOnly>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/admin/orders">
            <Button variant="outline">View All Orders</Button>
          </Link>
          <Link to="/admin/products">
            <Button>Manage Products</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Unique customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
            <p className="text-sm text-red-600 mt-2">
              If this persists, please check:
              <br />• Your admin role is correctly assigned
              <br />• RLS policies allow admin access to orders
              <br />• Database connection is working
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest orders from your store
            {recentOrders.length > 0 && ` • Showing ${recentOrders.length} of ${stats.totalOrders} total`}
            {!isLoading && recentOrders.length === 0 && stats.totalOrders > 0 && ' • Check console for details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            console.log('🔍 Dashboard Render: recentOrders.length =', recentOrders.length, 'isLoading =', isLoading, 'stats.totalOrders =', stats.totalOrders);
            return null;
          })()}
          {recentOrders.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No orders found</p>
              {error ? (
                <p className="text-sm text-muted-foreground">Please check the error message above</p>
              ) : (
                <p className="text-sm text-muted-foreground">Orders will appear here once customers place them</p>
              )}
            </div>
          ) : recentOrders.length === 0 && isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status || 'pending')}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(order.total_amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/admin/orders">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Order Management</h3>
                <p className="text-sm text-muted-foreground">View and manage orders</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/products">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Product Management</h3>
                <p className="text-sm text-muted-foreground">Manage products & inventory</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/shipping">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Shipping</h3>
                <p className="text-sm text-muted-foreground">Manage shipments & tracking</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      </div>
    </SuperAdminOnly>
  );
}
