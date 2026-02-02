import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNimbuspost } from '@/hooks/useNimbuspost';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Package, Printer, MapPin, X, Search, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  shipping_address: {
    full_name?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  status: string;
  created_at: string;
}

interface Shipment {
  id: string;
  order_id: string;
  awb: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  tracking_status: string | null;
  created_at: string;
  orders?: { order_number: string } | null;
}

interface TrackingEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
}

export default function ShippingPage() {
  const { user, isAdmin, isStaff } = useAuth();
  const { loading: nimbuspostLoading, createConsignment, downloadShippingLabel, trackShipment, cancelShipment } = useNimbuspost();

  // Create Shipment Form State
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [weightKg, setWeightKg] = useState('0.5');
  const [length, setLength] = useState('10');
  const [width, setWidth] = useState('10');
  const [height, setHeight] = useState('10');
  const [isCOD, setIsCOD] = useState(false);
  const [codAmount, setCodAmount] = useState('');
  const [createdAwb, setCreatedAwb] = useState<string | null>(null);

  // Shipments Table State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalShipments, setTotalShipments] = useState(0);
  const pageSize = 20;

  // Tracking Modal State
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingData, setTrackingData] = useState<{ currentStatus: string; lastUpdatedDate: string; lastLocation: string; history: TrackingEvent[] } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Cancel Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelAwb, setCancelAwb] = useState('');

  // Quick Track State
  const [quickTrackAwb, setQuickTrackAwb] = useState('');

  // Fetch pending orders
  useEffect(() => {
    if (!(isAdmin || isStaff)) return;
    fetchPendingOrders();
    fetchShipments();
  }, [isAdmin, isStaff, statusFilter, dateFrom, dateTo, currentPage]);

  const fetchPendingOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, shipping_address, status, created_at')
      .in('status', ['pending', 'confirmed', 'processing'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const fetchShipments = async () => {
    let query = supabase
      .from('shipments')
      .select('*, orders(order_number)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59');
    }

    const { data, error, count } = await query;

    if (!error && data) {
      setShipments(data as Shipment[]);
      setTotalShipments(count || 0);
    }
  };

  // Handle order selection
  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      setSelectedOrder(order || null);
      if (order?.total_amount) {
        setCodAmount(order.total_amount.toString());
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

  const handleCreateShipment = async () => {
    if (!selectedOrder) {
      toast.error('Please select an order');
      return;
    }

    const address = selectedOrder.shipping_address;
    if (!address?.full_name || !address?.phone || !address?.address_line1 || !address?.pincode || !address?.city || !address?.state) {
      toast.error('Order is missing required shipping address details');
      return;
    }

    try {
      const result = await createConsignment({
        orderId: selectedOrder.order_number,
        customerName: address.full_name,
        phone: address.phone,
        address: [address.address_line1, address.address_line2].filter(Boolean).join(', '),
        pincode: address.pincode,
        city: address.city,
        state: address.state,
        items: [],
        totalValue: selectedOrder.total_amount,
        weightKg: parseFloat(weightKg) || 0.5,
        dimensionsCm: {
          length: parseFloat(length) || 10,
          width: parseFloat(width) || 10,
          height: parseFloat(height) || 10,
        },
        isCOD,
        codAmount: isCOD ? parseFloat(codAmount) : undefined,
      });

      // Save to database
      await supabase.from('shipments').insert({
        order_id: selectedOrder.id,
        awb: result.awb,
        customer_name: address.full_name,
        customer_phone: address.phone,
        shipping_address: address,
        weight_kg: parseFloat(weightKg) || 0.5,
        dimensions_cm: { length: parseFloat(length), width: parseFloat(width), height: parseFloat(height) },
        is_cod: isCOD,
        cod_amount: isCOD ? parseFloat(codAmount) : null,
        status: 'booked',
      });

      // Update order status
      await supabase.from('orders').update({ status: 'shipped' }).eq('id', selectedOrder.id);

      setCreatedAwb(result.awb);
      toast.success(`Shipment created! AWB: ${result.awb}`);
      fetchPendingOrders();
      fetchShipments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create shipment');
    }
  };

  const handlePrintLabel = async (awb: string) => {
    try {
      await downloadShippingLabel(awb);
      toast.success('Label downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download label');
    }
  };

  const handleTrack = async (awb: string) => {
    setTrackingAwb(awb);
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    try {
      const data = await trackShipment(awb);
      setTrackingData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to track shipment');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleQuickTrack = async () => {
    if (!quickTrackAwb.trim()) {
      toast.error('Please enter an AWB number');
      return;
    }
    await handleTrack(quickTrackAwb.trim());
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelShipment(cancelAwb);
      await supabase.from('shipments').update({ status: 'cancelled' }).eq('awb', cancelAwb);
      toast.success('Shipment cancelled');
      setCancelDialogOpen(false);
      fetchShipments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel shipment');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      booked: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      'in-transit': { variant: 'default', icon: <Truck className="h-3 w-3" /> },
      delivered: { variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: 'destructive', icon: <X className="h-3 w-3" /> },
    };
    const config = variants[status] || variants.booked;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (!user || !(isAdmin || isStaff)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>You need admin or staff privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Shipping Management</h1>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Shipment</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="track">Quick Track</TabsTrigger>
        </TabsList>

        {/* Section 1: Create Shipment Form */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Shipment</CardTitle>
              <CardDescription>Select an order and create a Nimbuspost shipment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Order</Label>
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an order..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - ₹{order.total_amount} ({order.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrder && (
                  <div className="p-4 bg-muted rounded-lg space-y-1">
                    <p className="font-medium">{selectedOrder.shipping_address?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.shipping_address?.phone}</p>
                    <p className="text-sm">
                      {selectedOrder.shipping_address?.address_line1}, {selectedOrder.shipping_address?.city}
                    </p>
                    <p className="text-sm">
                      {selectedOrder.shipping_address?.state} - {selectedOrder.shipping_address?.pincode}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Length (cm)</Label>
                  <Input type="number" value={length} onChange={e => setLength(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Width (cm)</Label>
                  <Input type="number" value={width} onChange={e => setWidth(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={isCOD} onCheckedChange={setIsCOD} />
                  <Label>Cash on Delivery</Label>
                </div>
                {isCOD && (
                  <div className="flex items-center gap-2">
                    <Label>COD Amount:</Label>
                    <Input type="number" className="w-32" value={codAmount} onChange={e => setCodAmount(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button onClick={handleCreateShipment} disabled={!selectedOrder || nimbuspostLoading}>
                  {nimbuspostLoading ? 'Creating...' : 'Create Shipment'}
                </Button>

                {createdAwb && (
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      AWB: {createdAwb}
                    </Badge>
                    <Button variant="outline" onClick={() => handlePrintLabel(createdAwb)}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Label
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section 2: Shipments Table */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>All Shipments</CardTitle>
              <CardDescription>Manage and track all shipments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
                <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>AWB</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map(shipment => (
                      <TableRow key={shipment.id}>
                        <TableCell>{shipment.orders?.order_number || '-'}</TableCell>
                        <TableCell className="font-mono">{shipment.awb}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{shipment.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                        <TableCell>{format(new Date(shipment.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePrintLabel(shipment.awb)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleTrack(shipment.awb)}>
                              <MapPin className="h-4 w-4" />
                            </Button>
                            {shipment.status === 'booked' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => {
                                  setCancelAwb(shipment.awb);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {shipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No shipments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalShipments > pageSize && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    Previous
                  </Button>
                  <span className="py-2 px-4 text-sm">
                    Page {currentPage} of {Math.ceil(totalShipments / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= Math.ceil(totalShipments / pageSize)}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section 3: Quick Track */}
        <TabsContent value="track">
          <Card>
            <CardHeader>
              <CardTitle>Quick Track</CardTitle>
              <CardDescription>Enter an AWB number to track any shipment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 max-w-md">
                <Input
                  placeholder="Enter AWB number..."
                  value={quickTrackAwb}
                  onChange={e => setQuickTrackAwb(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickTrack()}
                />
                <Button onClick={handleQuickTrack} disabled={nimbuspostLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tracking Modal */}
      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tracking: {trackingAwb}</DialogTitle>
            <DialogDescription>Shipment journey timeline</DialogDescription>
          </DialogHeader>
          {trackingLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading tracking info...</div>
          ) : trackingData ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold text-lg">{trackingData.currentStatus}</p>
                <p className="text-sm text-muted-foreground">
                  {trackingData.lastLocation} • {trackingData.lastUpdatedDate}
                </p>
              </div>
              <div className="space-y-3">
                {trackingData.history.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      {idx < trackingData.history.length - 1 && <div className="w-0.5 h-full bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{event.status}</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                  </div>
                ))}
                {trackingData.history.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No tracking events yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No tracking data available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Shipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel shipment {cancelAwb}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Shipment
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={nimbuspostLoading}>
              Cancel Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
