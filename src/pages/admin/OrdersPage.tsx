import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, Package, RefreshCw, Truck, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import AdminOrStaffOnly from '@/components/admin/AdminOrStaffOnly';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [nimbusCreateLoading, setNimbusCreateLoading] = useState(false);
  const [nimbusCreateError, setNimbusCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time: refetch when new orders are created or updated so admin sees orders without manual refresh
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter, orderTypeFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      // Fetch all orders including subscription orders
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      const orderList = data || [];
      console.log(`✅ Fetched ${orderList.length} orders from database`);
      setOrders(orderList);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(`Failed to load orders: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const addr = order.shipping_address as any;
        const name = addr?.full_name || addr?.fullName;
        const nameMatches = name ? String(name).toLowerCase().includes(query) : false;

        return (
          order.order_number.toLowerCase().includes(query) ||
          nameMatches
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter((order) => {
        const isSubscription = order.order_number?.startsWith('SUB-');
        return orderTypeFilter === 'subscription' ? isSubscription : !isSubscription;
      });
    }

    setFilteredOrders(filtered);
  };

  const createNimbusShipment = async () => {
    if (!selectedOrder) return;
    setNimbusCreateLoading(true);
    setNimbusCreateError(null);
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-nimbuspost-shipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_number: selectedOrder.order_number,
        }),
      });
      const text = await res.text();
      let data: { success?: boolean; error?: string; details?: string; hint?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('[Nimbus] Response not JSON:', text?.slice(0, 200));
      }
      if (import.meta.env.DEV) {
        console.log('[Nimbus] Create shipment response:', res.status, data);
      }
      const nimbusBody = (data as { data?: unknown }).data;
      if (import.meta.env.DEV && nimbusBody != null) {
        console.log('[Nimbus] Nimbus API response (expand to inspect):', nimbusBody);
      }
      if (!res.ok || !data?.success) {
        let msg = data?.error || data?.details || (res.ok ? 'Unknown error' : `Request failed: ${res.status}`);
        if (data?.hint) {
          msg += '\n\n' + data.hint;
        } else if (typeof msg === 'string' && (msg.includes('Token') || msg.includes('token') || msg.includes('invalid Token'))) {
          msg += ' Use the Old API key from Nimbuspost (Settings → API → “Your API Key” under Old API), set as NIMBUS_API_KEY in Supabase → Edge Functions → Secrets.';
        }
        setNimbusCreateError(msg);
        toast.error(msg);
        return;
      }
      if (data?.skipped) {
        const msg = data?.message || 'Nimbus Post is not configured. Orders are not being sent to Nimbus.';
        setNimbusCreateError(msg);
        toast.warning(msg);
      } else if ((data as { nimbus_response_empty?: boolean }).nimbus_response_empty) {
        const msg = 'Order data was sent to Nimbus but we got no confirmation. If the order does not appear in Nimbus Post, the API endpoint or payload may be wrong. Get the correct "create order" API from Nimbus Post → Settings → API (or support) and set NIMBUS_API_ORDERS_PATH if needed.';
        setNimbusCreateError(msg);
        toast.warning(msg);
      } else {
        setNimbusCreateError(null);
        toast.success(`Shipment created for ${selectedOrder.order_number}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create shipment';
      console.error('[Nimbus] Create shipment error:', err);
      setNimbusCreateError(msg);
      toast.error(msg);
    } finally {
      setNimbusCreateLoading(false);
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
    setOrderItems([]);
    setNimbusCreateError(null);

    try {
      console.log('🔍 OrdersPage: Fetching items for order:', order.id, order.order_number);
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) {
        console.error('❌ OrdersPage: Error fetching order items:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Failed to load order items: ${error.message}`);
        setOrderItems([]);
      } else {
        console.log(`✅ OrdersPage: Fetched ${data?.length || 0} items for order ${order.order_number}`);
        console.log('📦 OrdersPage: Order items:', data);
        setOrderItems(data || []);
      }
    } catch (error: any) {
      console.error('❌ OrdersPage: Exception fetching order items:', error);
      toast.error('Failed to load order items');
      setOrderItems([]);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const createNimbuspostShipment = async (order: Order) => {
    setCreatingShipment(true);
    try {
      const addr = order.shipping_address as Record<string, string> | null;
      const payload = {
        orderId: order.id,
        customerName: addr?.fullName || addr?.full_name || 'Customer',
        customerPhone: addr?.phone || '',
        customerEmail: addr?.email || '',
        shippingAddress: {
          fullName: addr?.fullName || addr?.full_name || 'Customer',
          addressLine1: addr?.addressLine1 || addr?.address_line1 || '',
          addressLine2: addr?.addressLine2 || addr?.address_line2 || '',
          city: addr?.city || '',
          state: addr?.state || '',
          pincode: addr?.pincode || '',
          phone: addr?.phone || '',
        },
        orderItems: orderItems.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          weight: item.weight ?? 0,
        })),
        totalWeight: 0.5,
        orderAmount: Number(order.total_amount),
        paymentType: (order.payment_type as 'prepaid' | 'cod') || 'prepaid',
        codAmount: order.payment_type === 'cod' ? Number(order.cod_balance || 0) : undefined,
      };
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-nimbuspost-shipment`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.awbNumber) {
        toast.success(`Shipment created. AWB: ${data.awbNumber}`);
        await fetchOrders();
        setSelectedOrder((prev) => prev ? { ...prev, nimbuspost_awb_number: data.awbNumber, nimbuspost_courier_name: data.courierName ?? null, nimbuspost_tracking_url: data.trackingUrl ?? null } : null);
      } else if (data.skipped) {
        const msg = data.message || 'Nimbuspost is not configured. Add NIMBUS_API_KEY in Supabase Dashboard → Project Settings → Edge Functions → Secrets (for this project).';
        toast.warning(msg);
      } else {
        toast.error(data.error || 'Failed to create shipment');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create shipment');
    } finally {
      setCreatingShipment(false);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <AdminOrStaffOnly>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All one-time orders and subscription orders
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by order number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="one-time">One-time Orders</SelectItem>
            <SelectItem value="subscription">Subscription Orders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} orders found
            {orders.length > 0 && (
              <span className="ml-2">
                ({orders.filter(o => o.order_number?.startsWith('SUB-')).length} subscription,{' '}
                {orders.filter(o => !o.order_number?.startsWith('SUB-')).length} one-time)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No orders found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const isSubscription = order.order_number?.startsWith('SUB-');
                  const addr = order.shipping_address as any;
                  const customerName = addr?.full_name || addr?.fullName || 'N/A';
                  return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <Badge variant={isSubscription ? 'default' : 'secondary'}>
                        {isSubscription ? 'Subscription' : 'One-time'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customerName}
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
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
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewOrderDetails(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder && new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Update */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Status:</span>
                <Select
                  value={selectedOrder.status || 'pending'}
                  onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-semibold mb-2">Shipping Address</h4>
                {selectedOrder.shipping_address ? (
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const addr = selectedOrder.shipping_address as any;
                      const name = addr?.full_name || addr?.fullName;
                      const line1 = addr?.address_line1 || addr?.addressLine1;
                      const line2 = addr?.address_line2 || addr?.addressLine2;
                      const city = addr?.city;
                      const state = addr?.state;
                      const pincode = addr?.pincode;
                      const phone = addr?.phone;
                      const email = addr?.email;

                      return (
                        <>
                          {name && <p>{name}</p>}
                          {line1 && <p>{line1}</p>}
                          {line2 && <p>{line2}</p>}
                          {(city || state || pincode) && (
                            <p>
                              {city}
                              {city && state && ', '}
                              {state}
                              {(city || state) && pincode && ' - '}
                              {pincode}
                            </p>
                          )}
                          {phone && <p>Phone: {phone}</p>}
                          {email && <p>Email: {email}</p>}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address available</p>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                {orderItems.length === 0 ? (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      No items found for this order.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This may indicate the order items were not created or there's an access issue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(item.weight && item.weight > 0 ? item.weight : 250)}g | Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">₹{Number(item.total_price).toLocaleString()}</p>
                      </div>
                    ))}
                    {orderItems.length > 0 && (
                      <p className="text-sm font-medium pt-2 border-t">
                        Total weight: {(orderItems.reduce((sum, item) => sum + (item.weight && item.weight > 0 ? item.weight : 250) * (item.quantity || 1), 0) / 1000).toFixed(2)} kg
                        <span className="text-muted-foreground font-normal ml-1">(use this in Nimbus/shipping)</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal</span>
                  <span>₹{Number(selectedOrder.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Shipping</span>
                  <span>₹{Number(selectedOrder.shipping_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Shipment (Nimbuspost) */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Shipment (Nimbuspost)
                </h4>
                {selectedOrder.nimbuspost_awb_number ? (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <p><span className="font-medium">AWB:</span> <span className="font-mono">{selectedOrder.nimbuspost_awb_number}</span></p>
                    {selectedOrder.nimbuspost_courier_name && (
                      <p><span className="font-medium">Courier:</span> {selectedOrder.nimbuspost_courier_name}</p>
                    )}
                    {selectedOrder.nimbuspost_tracking_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedOrder.nimbuspost_tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                          Track shipment <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">No shipment created yet.</p>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={createNimbusShipment}
                      disabled={nimbusCreateLoading || orderItems.length === 0}
                    >
                      {nimbusCreateLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating…</> : 'Create shipment'}
                    </Button>
                    {nimbusCreateError && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                        {nimbusCreateError}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminOrStaffOnly>
  );
}
