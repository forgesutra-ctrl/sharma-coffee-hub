import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  Clock,
  MapPin,
  ChevronRight,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Json } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;
type Shipment = Tables<'shipments'>;

interface OrderWithDetails extends Order {
  items: OrderItem[];
  shipment: Shipment | null;
}

interface ShippingAddress {
  full_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? user?.id;
      if (!userId || cancelled) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error) throw error;
        console.log("[My Orders] query user_id:", userId, "orders returned:", orderData?.length ?? 0, "order_numbers:", orderData?.map((o) => o.order_number) ?? []);
        if (!orderData) {
          setOrders([]);
          return;
        }
        // Probe shipments table once; if missing (406) or error, skip per-order shipment fetches to avoid N 406s
        const { error: probeError } = await supabase.from('shipments').select('id').limit(1).maybeSingle();
        const shipmentsAvailable = !probeError;
        // #region agent log
        fetch('http://127.0.0.1:7247/ingest/8cc46726-3f6d-46a3-8278-7056d35ca027',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AccountOrders.tsx:useEffect:probe',message:'Shipments probe',data:{shipmentsAvailable,probe_code:(probeError as any)?.code,probe_message:(probeError as any)?.message},timestamp:Date.now(),hypothesisId:'H4',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        const ordersWithDetails = await Promise.all(
          orderData.map(async (order) => {
            const itemsPromise = supabase.from('order_items').select('*').eq('order_id', order.id);
            const shipmentPromise = shipmentsAvailable
              ? supabase.from('shipments').select('*').eq('order_id', order.id).maybeSingle()
              : Promise.resolve({ data: null, error: null });
            const [itemsResult, shipmentResult] = await Promise.all([itemsPromise, shipmentPromise]);
            let shipmentData = null;
            if (shipmentResult && !shipmentResult.error && shipmentResult.data) shipmentData = shipmentResult.data;
            return { ...order, items: itemsResult.data || [], shipment: shipmentData };
          })
        );
        setOrders(ordersWithDetails);
      } catch (e) {
        if (!cancelled) console.error('Error fetching orders:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!orderData) return;

      // Probe shipments table once; if missing (406) or error, skip per-order shipment fetches
      const { error: probeError } = await supabase.from('shipments').select('id').limit(1).maybeSingle();
      const shipmentsAvailable = !probeError;
      // #region agent log
      fetch('http://127.0.0.1:7247/ingest/8cc46726-3f6d-46a3-8278-7056d35ca027',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AccountOrders.tsx:fetchOrders:probe',message:'Shipments probe',data:{shipmentsAvailable,probe_code:(probeError as any)?.code,probe_message:(probeError as any)?.message},timestamp:Date.now(),hypothesisId:'H4',runId:'post-fix'})}).catch(()=>{});
      // #endregion

      const ordersWithDetails = await Promise.all(
        orderData.map(async (order) => {
          const itemsPromise = supabase.from('order_items').select('*').eq('order_id', order.id);
          const shipmentPromise = shipmentsAvailable
            ? supabase.from('shipments').select('*').eq('order_id', order.id).maybeSingle()
            : Promise.resolve({ data: null, error: null });
          const [itemsResult, shipmentResult] = await Promise.all([itemsPromise, shipmentPromise]);

          if (itemsResult.error) {
            console.error(`Error fetching items for order ${order.id}:`, itemsResult.error);
          }

          // Handle shipment result - check if it's an error response
          let shipmentData = null;
          if (shipmentResult && !shipmentResult.error && shipmentResult.data) {
            shipmentData = shipmentResult.data;
          }

          return {
            ...order,
            items: itemsResult.data || [],
            shipment: shipmentData,
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackShipment = async (awb: string) => {
    setTrackingLoading(true);
    setTrackingOpen(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('nimbuspost-track', {
        body: { awb },
      });

      if (error) throw error;
      setTrackingData(data);
    } catch (error) {
      console.error('Error tracking shipment:', error);
      setTrackingData({ error: 'Unable to fetch tracking information' });
    } finally {
      setTrackingLoading(false);
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

  const parseShippingAddress = (address: Json | null): ShippingAddress | null => {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return null;
    return address as ShippingAddress;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your orders
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">
              When you place an order, it will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const shippingAddress = parseShippingAddress(order.shipping_address);
            
            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Order #{order.order_number}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status || 'pending')}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-2">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.product_name} ({item.weight}g × {item.quantity})
                          </span>
                          <span className="font-medium">₹{item.total_price}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.items.length - 2} more item(s)
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Item details unavailable
                    </p>
                  )}

                  <Separator />

                  {/* Order Summary */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold text-lg">₹{order.total_amount}</span>
                  </div>

                  {/* Shipping Address */}
                  {shippingAddress && (
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-muted-foreground">
                        <p className="font-medium text-foreground">{shippingAddress.full_name}</p>
                        <p>{shippingAddress.address_line1}</p>
                        {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                        <p>{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}</p>
                      </div>
                    </div>
                  )}

                  {/* Shipment Tracking (Nimbuspost AWB on order or legacy shipments table) */}
                  {(order.nimbuspost_awb_number || (order.shipment && order.shipment.awb)) && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            AWB: {order.nimbuspost_awb_number || order.shipment!.awb}
                          </p>
                          {order.shipment?.tracking_status && (
                            <p className="text-xs text-muted-foreground">
                              {order.shipment.tracking_status}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTrackShipment(order.nimbuspost_awb_number || order.shipment!.awb)}
                      >
                        Track
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder && new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge className={getStatusColor(selectedOrder.status || 'pending')}>
                  {selectedOrder.status}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Items</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p>{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.weight}g • Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium">₹{item.total_price}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No items found for this order. This may be due to a data migration issue.
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                {selectedOrder.shipping_amount && selectedOrder.shipping_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₹{selectedOrder.shipping_amount}</span>
                  </div>
                )}
                {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{selectedOrder.discount_amount}</span>
                  </div>
                )}
                {selectedOrder.payment_type === "cod" && selectedOrder.cod_handling_fee && selectedOrder.cod_handling_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COD Handling Fee</span>
                    <span>₹{selectedOrder.cod_handling_fee}</span>
                  </div>
                )}
                
                {/* COD Breakdown */}
                {selectedOrder.payment_type === "cod" && (
                  <>
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upfront Payment</span>
                        <span className="font-medium text-primary">₹{((selectedOrder.cod_advance_paid || 0) + (selectedOrder.cod_handling_fee || 0))}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pl-2">
                        <span>• Advance (from product): ₹{selectedOrder.cod_advance_paid || 100}</span>
                        <span>• COD Handling Fee: ₹{selectedOrder.cod_handling_fee || 50}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance on Delivery</span>
                        <span className="font-medium">₹{selectedOrder.cod_balance || 0}</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total Order Value</span>
                      <span>₹{selectedOrder.total_amount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 italic">
                      Total = Product (₹{selectedOrder.subtotal}) + Shipping (₹{selectedOrder.shipping_amount || 0}) + COD Handling (₹{selectedOrder.cod_handling_fee || 50})
                    </div>
                  </>
                )}
                
                {/* Prepaid Payment */}
                {selectedOrder.payment_type !== "cod" && (
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total Paid</span>
                    <span>₹{selectedOrder.total_amount}</span>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
            <DialogDescription>
              Real-time tracking information
            </DialogDescription>
          </DialogHeader>
          
          {trackingLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : trackingData?.error ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {trackingData.error}
            </p>
          ) : trackingData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Current Status</span>
                <Badge>{trackingData.currentStatus || 'Unknown'}</Badge>
              </div>
              
              {trackingData.history && trackingData.history.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Tracking History</h4>
                  <div className="space-y-2">
                    {trackingData.history.map((event: any, index: number) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                        <div>
                          <p className="font-medium">{event.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.location} • {event.date}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
