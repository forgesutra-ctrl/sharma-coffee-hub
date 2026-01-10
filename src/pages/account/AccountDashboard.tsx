import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  MapPin, 
  Truck, 
  RefreshCw,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Order = Tables<'orders'>;
type Shipment = Tables<'shipments'>;

export default function AccountDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [latestShipment, setLatestShipment] = useState<Shipment | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      // Fetch latest order
      const { data: orderData, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderData && orderData.length > 0) {
        setLatestOrder(orderData[0]);
        setOrderCount(count || 0);

        // Fetch shipment for latest order
        const { data: shipmentData } = await supabase
          .from('shipments')
          .select('*')
          .eq('order_id', orderData[0].id)
          .single();

        if (shipmentData) setLatestShipment(shipmentData);
      }

      // Fetch address count
      const { count: addrCount } = await supabase
        .from('customer_addresses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setAddressCount(addrCount || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your account
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orderCount}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{addressCount}</p>
                <p className="text-xs text-muted-foreground">Saved Addresses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Subscriptions</p>
                <Link to="/account/subscriptions" className="text-xs text-primary hover:underline">
                  Manage →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Order */}
      {latestOrder ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Latest Order</CardTitle>
                <CardDescription>Order #{latestOrder.order_number}</CardDescription>
              </div>
              <Badge className={getStatusColor(latestOrder.status || 'pending')}>
                {latestOrder.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(latestOrder.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="font-semibold">₹{latestOrder.total_amount}</p>
            </div>

            {latestShipment && latestShipment.awb && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Shipment Tracking</p>
                  <p className="text-xs text-muted-foreground truncate">
                    AWB: {latestShipment.awb}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/account/orders`}>
                    Track
                  </Link>
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/account/orders">
                  View All Orders
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start exploring our coffee collection
            </p>
            <Button asChild>
              <Link to="/shop">Shop Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link 
          to="/account/orders" 
          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">View Orders</p>
            <p className="text-sm text-muted-foreground">Track and manage orders</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link 
          to="/account/addresses" 
          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Manage Addresses</p>
            <p className="text-sm text-muted-foreground">Add or edit delivery addresses</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
