import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  ShoppingCart, 
  Truck, 
  AlertTriangle, 
  Search, 
  Eye, 
  XCircle,
  Plus,
  Minus,
  MapPin,
  Clock,
  StickyNote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useDTDC } from '@/hooks/useDTDC';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import BulkInventoryUpload from '@/components/admin/BulkInventoryUpload';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';

// Types
interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  category: string;
  is_active: boolean;
  product_variants: {
    id: string;
    weight: number;
    price: number;
    stock_quantity: number | null;
  }[];
}

interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_session_id: string | null;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null;
  payment_status: string | null;
  payment_method: string | null;
  total_amount: number;
  subtotal: number;
  shipping_amount: number | null;
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  weight: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Shipment {
  id: string;
  order_id: string | null;
  awb: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  tracking_status: string | null;
  last_tracking_update: string | null;
  created_at: string;
  orders?: { order_number: string } | null;
}

interface EscalationNote {
  id: string;
  note: string;
  created_at: string;
}

const LOW_STOCK_THRESHOLD = 10;
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export default function OperationsPage() {
  const { user } = useAuth();
  const { trackShipment, cancelShipment, loading: dtdcLoading } = useDTDC();
  const [activeTab, setActiveTab] = useState('inventory');

  // ========== INVENTORY STATE ==========
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState('');
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{
    productId: string;
    productName: string;
    variantId: string;
    weight: number;
    currentStock: number;
  } | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [stockReason, setStockReason] = useState('');

  // ========== ORDERS STATE ==========
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // ========== SHIPPING ESCALATIONS STATE ==========
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [escalationNotes, setEscalationNotes] = useState<EscalationNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // ========== DATA FETCHING ==========
  useEffect(() => {
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'escalations') fetchEscalatedShipments();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [orderStatusFilter, paymentStatusFilter, paymentMethodFilter, orderDateFrom, orderDateTo]);

  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, category, is_active, product_variants(id, weight, price, stock_quantity)')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderStatusFilter !== 'all') {
        query = query.eq('status', orderStatusFilter as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled');
      }
      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter);
      }
      if (paymentMethodFilter === 'cod') {
        query = query.eq('payment_method', 'cod');
      } else if (paymentMethodFilter === 'prepaid') {
        query = query.neq('payment_method', 'cod');
      }
      if (orderDateFrom) {
        query = query.gte('created_at', orderDateFrom);
      }
      if (orderDateTo) {
        query = query.lte('created_at', orderDateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchEscalatedShipments = async () => {
    setShipmentsLoading(true);
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders(order_number)')
        .or(`last_tracking_update.lt.${threeDaysAgo.toISOString()},last_tracking_update.is.null,tracking_status.ilike.%exception%,tracking_status.ilike.%undelivered%,status.eq.exception,status.eq.undelivered`)
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error fetching escalated shipments:', error);
      toast.error('Failed to load escalated shipments');
    } finally {
      setShipmentsLoading(false);
    }
  };

  // ========== INVENTORY ACTIONS ==========
  const openStockDialog = (product: ProductWithVariants, variant: ProductWithVariants['product_variants'][0]) => {
    setSelectedVariant({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      weight: variant.weight,
      currentStock: variant.stock_quantity || 0,
    });
    setStockAdjustment(0);
    setStockReason('');
    setStockDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant || !user) return;
    if (stockAdjustment === 0) {
      toast.error('Please enter a stock adjustment');
      return;
    }
    if (!stockReason.trim()) {
      toast.error('Please enter a reason for the adjustment');
      return;
    }

    const newQuantity = selectedVariant.currentStock + stockAdjustment;
    if (newQuantity < 0) {
      toast.error('Stock cannot go below 0');
      return;
    }

    try {
      // Update variant stock
      const { error: updateError } = await supabase
        .from('product_variants')
        .update({ stock_quantity: newQuantity })
        .eq('id', selectedVariant.variantId);

      if (updateError) throw updateError;

      // Log the change
      const { error: logError } = await supabase
        .from('stock_change_logs')
        .insert({
          variant_id: selectedVariant.variantId,
          product_id: selectedVariant.productId,
          previous_quantity: selectedVariant.currentStock,
          new_quantity: newQuantity,
          change_amount: stockAdjustment,
          reason: stockReason.trim(),
          changed_by: user.id,
        });

      if (logError) throw logError;

      toast.success(`Stock updated: ${selectedVariant.productName} (${selectedVariant.weight}g)`);
      setStockDialogOpen(false);
      fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  // ========== ORDERS ACTIONS ==========
  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);

    try {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    await updateOrderStatus(orderId, 'cancelled');
  };

  // ========== SHIPPING ESCALATION ACTIONS ==========
  const getEscalationReason = (shipment: Shipment): string => {
    if (shipment.tracking_status?.toLowerCase().includes('exception')) return 'Exception';
    if (shipment.tracking_status?.toLowerCase().includes('undelivered')) return 'Undelivered';
    if (shipment.status === 'exception') return 'Exception';
    if (shipment.status === 'undelivered') return 'Undelivered';
    
    if (shipment.last_tracking_update) {
      const daysSinceUpdate = differenceInDays(new Date(), new Date(shipment.last_tracking_update));
      if (daysSinceUpdate >= 3) return `No update for ${daysSinceUpdate} days`;
    } else {
      return 'No tracking updates';
    }
    
    return 'Flagged';
  };

  const openNotesDialog = async (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setNewNote('');
    setNoteDialogOpen(true);

    try {
      const { data } = await supabase
        .from('shipping_escalation_notes')
        .select('id, note, created_at')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: false });
      setEscalationNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addEscalationNote = async () => {
    if (!selectedShipment || !user || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('shipping_escalation_notes')
        .insert({
          shipment_id: selectedShipment.id,
          note: newNote.trim(),
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Note added');
      setNewNote('');
      
      // Refresh notes
      const { data } = await supabase
        .from('shipping_escalation_notes')
        .select('id, note, created_at')
        .eq('shipment_id', selectedShipment.id)
        .order('created_at', { ascending: false });
      setEscalationNotes(data || []);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleTrackShipment = async (awb: string) => {
    setTrackingDialogOpen(true);
    setTrackingLoading(true);
    setTrackingData(null);

    try {
      const data = await trackShipment(awb);
      setTrackingData(data);
    } catch (error) {
      toast.error('Failed to track shipment');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCancelShipment = async (shipment: Shipment) => {
    if (!confirm(`Cancel shipment ${shipment.awb}?`)) return;

    try {
      await cancelShipment(shipment.awb);
      await supabase.from('shipments').update({ status: 'cancelled' }).eq('awb', shipment.awb);
      toast.success('Shipment cancelled');
      fetchEscalatedShipments();
    } catch (error) {
      toast.error('Failed to cancel shipment');
    }
  };

  // ========== HELPERS ==========
  const getStatusBadge = (status: string | null) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return <Badge className={colors[status || 'pending'] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const getPaymentBadge = (status: string | null) => {
    if (status === 'paid') return <Badge variant="default">Paid</Badge>;
    if (status === 'refunded') return <Badge variant="secondary">Refunded</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    p.category.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.order_number.toLowerCase().includes(ordersSearch.toLowerCase()) ||
    (o.shipping_address as any)?.full_name?.toLowerCase().includes(ordersSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Operations</h1>
          <p className="text-muted-foreground">Manage inventory, orders, and shipping escalations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="escalations" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Escalations
          </TabsTrigger>
        </TabsList>

        {/* ========== INVENTORY TAB ========== */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Bulk Upload - Super Admin Only */}
          <SuperAdminOnly>
            <BulkInventoryUpload />
          </SuperAdminOnly>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                Manage stock levels for all product variants. Low stock (&lt;{LOW_STOCK_THRESHOLD}) is highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No products found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Grind Types</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.flatMap(product =>
                      product.product_variants.map(variant => {
                        const isLowStock = (variant.stock_quantity || 0) < LOW_STOCK_THRESHOLD;
                        return (
                          <TableRow
                            key={variant.id}
                            className={isLowStock ? 'bg-red-50 dark:bg-red-900/10' : ''}
                          >
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{product.categories?.name || product.category}</Badge>
                            </TableCell>
                            <TableCell>{variant.weight}g @ ₹{Number(variant.price).toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              -
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={isLowStock ? 'destructive' : 'outline'}>
                                {variant.stock_quantity ?? 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockDialog(product, variant)}
                              >
                                Adjust
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ORDERS TAB ========== */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by order number or customer..."
                  value={ordersSearch}
                  onChange={e => setOrdersSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  {PAYMENT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-[150px]"
                value={orderDateFrom}
                onChange={e => setOrderDateFrom(e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                className="w-[150px]"
                value={orderDateTo}
                onChange={e => setOrderDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>{filteredOrders.length} orders (guest + registered)</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No orders found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{(order.shipping_address as any)?.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={order.user_id ? 'default' : 'secondary'}>
                            {order.user_id ? 'Registered' : 'Guest'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getPaymentBadge(order.payment_status)}
                            {order.payment_method === 'cod' && (
                              <Badge variant="outline" className="text-xs">COD</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{Number(order.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewOrderDetails(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelOrder(order.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ESCALATIONS TAB ========== */}
        <TabsContent value="escalations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Shipping Escalations
              </CardTitle>
              <CardDescription>
                Shipments flagged for: no tracking update for 3+ days, exception status, or undelivered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : shipments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No escalated shipments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>AWB</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map(shipment => (
                      <TableRow key={shipment.id} className="bg-orange-50 dark:bg-orange-900/10">
                        <TableCell className="font-mono text-sm">
                          {shipment.orders?.order_number || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{shipment.awb}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{shipment.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{shipment.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{getEscalationReason(shipment)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {shipment.last_tracking_update
                            ? format(new Date(shipment.last_tracking_update), 'dd MMM yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTrackShipment(shipment.awb)}
                              disabled={dtdcLoading}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNotesDialog(shipment)}
                            >
                              <StickyNote className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelShipment(shipment)}
                              disabled={dtdcLoading}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========== STOCK ADJUSTMENT DIALOG ========== */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedVariant?.productName} - {selectedVariant?.weight}g
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Current Stock:</span>
              <Badge variant="outline" className="text-lg px-4">
                {selectedVariant?.currentStock}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Adjustment</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => prev - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={stockAdjustment}
                  onChange={e => setStockAdjustment(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => prev + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                New stock: {(selectedVariant?.currentStock || 0) + stockAdjustment}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for adjustment *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Received new shipment, Damaged goods, Inventory correction..."
                value={stockReason}
                onChange={e => setStockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStockAdjustment}>Save Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== ORDER DETAILS DIALOG ========== */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              {selectedOrder && format(new Date(selectedOrder.created_at), 'dd MMM yyyy, HH:mm')}
              {' • '}
              {selectedOrder?.user_id ? 'Registered User' : 'Guest Checkout'}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Update */}
              <div className="flex items-center gap-4">
                <Label>Status:</Label>
                <Select
                  value={selectedOrder.status || 'pending'}
                  onValueChange={value => updateOrderStatus(selectedOrder.id, value as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                {getPaymentBadge(selectedOrder.payment_status)}
                {selectedOrder.payment_method === 'cod' && (
                  <Badge variant="outline">COD</Badge>
                )}
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-semibold mb-2">Shipping Address</h4>
                {selectedOrder.shipping_address ? (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">{(selectedOrder.shipping_address as any).full_name}</p>
                    <p>{(selectedOrder.shipping_address as any).address_line1}</p>
                    {(selectedOrder.shipping_address as any).address_line2 && (
                      <p>{(selectedOrder.shipping_address as any).address_line2}</p>
                    )}
                    <p>
                      {(selectedOrder.shipping_address as any).city}, {(selectedOrder.shipping_address as any).state} - {(selectedOrder.shipping_address as any).pincode}
                    </p>
                    <p>Phone: {(selectedOrder.shipping_address as any).phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address available</p>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="space-y-2">
                  {orderItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.weight}g | Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">₹{Number(item.total_price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{Number(selectedOrder.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>₹{Number(selectedOrder.shipping_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Refund Status Note */}
              {selectedOrder.status === 'cancelled' && selectedOrder.payment_status === 'paid' && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    ⚠️ This order is cancelled but payment was made. Refund may be required.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== ESCALATION NOTES DIALOG ========== */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalation Notes</DialogTitle>
            <DialogDescription>
              AWB: {selectedShipment?.awb} • {selectedShipment?.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Note</Label>
              <Textarea
                placeholder="Add internal escalation note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
              />
              <Button onClick={addEscalationNote} disabled={!newNote.trim()} className="w-full">
                Add Note
              </Button>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Previous Notes</h4>
              {escalationNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {escalationNotes.map(note => (
                    <div key={note.id} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== TRACKING DIALOG ========== */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
          </DialogHeader>
          {trackingLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : trackingData ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{trackingData.currentStatus}</p>
                <p className="text-sm text-muted-foreground">{trackingData.lastLocation}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {trackingData.lastUpdatedDate}
                </p>
              </div>
              {trackingData.history && trackingData.history.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold">History</h4>
                  {trackingData.history.map((event: any, idx: number) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{event.status}</p>
                        <p className="text-muted-foreground">{event.location} • {event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No tracking data available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
