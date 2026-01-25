import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Eye, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import AdminOrStaffOnly from '@/components/admin/AdminOrStaffOnly';

type Profile = Tables<'profiles'>;
type CustomerSegment = Tables<'customer_segments'>;
type Order = Tables<'orders'>;

interface CustomerData extends Profile {
  segment?: CustomerSegment;
  orders?: Order[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Step 1: Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Step 2: Fetch all orders to get customer info from shipping_address
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, user_id, shipping_address, created_at, total_amount, order_number, status')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Step 3: Create a map of customers from profiles
      const customerMap = new Map<string, CustomerData>();
      
      // Add customers from profiles
      (profiles || []).forEach(profile => {
        customerMap.set(profile.id, {
          ...profile,
          segment: undefined,
          orders: [],
        });
      });

      // Step 4: Extract customers from orders (including guest orders)
      (allOrders || []).forEach(order => {
        const shippingAddress = order.shipping_address as any;
        if (!shippingAddress) return;

        const email = shippingAddress.email || shippingAddress.Email || '';
        const phone = shippingAddress.phone || shippingAddress.Phone || shippingAddress.phoneNumber || '';
        const fullName = shippingAddress.fullName || shippingAddress.full_name || shippingAddress.customerName || shippingAddress.name || 'Guest Customer';

        // If order has user_id, use that profile
        if (order.user_id) {
          const existingCustomer = customerMap.get(order.user_id);
          if (existingCustomer) {
            // Update customer info if missing
            if (!existingCustomer.email && email) existingCustomer.email = email;
            if (!existingCustomer.full_name && fullName) existingCustomer.full_name = fullName;
            if (!existingCustomer.phone && phone) existingCustomer.phone = phone;
            existingCustomer.orders = existingCustomer.orders || [];
            existingCustomer.orders.push(order as any);
          } else {
            // Create customer from order with user_id
            customerMap.set(order.user_id, {
              id: order.user_id,
              email: email || '',
              full_name: fullName,
              phone: phone || '',
              avatar_url: null,
              created_at: order.created_at,
              updated_at: order.created_at,
              segment: undefined,
              orders: [order as any],
            });
          }
        } else if (email) {
          // Guest order - find or create customer by email
          const existingCustomer = Array.from(customerMap.values()).find(c => c.email === email);
          if (existingCustomer) {
            existingCustomer.orders = existingCustomer.orders || [];
            existingCustomer.orders.push(order as any);
          } else {
            // Create new customer from guest order
            const guestId = `guest-${email}`;
            customerMap.set(guestId, {
              id: guestId,
              email: email,
              full_name: fullName,
              phone: phone || '',
              avatar_url: null,
              created_at: order.created_at,
              updated_at: order.created_at,
              segment: undefined,
              orders: [order as any],
            });
          }
        }
      });

      // Step 5: Fetch segments and orders for each customer
      const customersWithData: CustomerData[] = await Promise.all(
        Array.from(customerMap.values()).map(async (customer) => {
          // Only fetch segment if customer has a valid UUID (not guest-*)
          let segment = undefined;
          if (customer.id && !customer.id.startsWith('guest-')) {
            const { data: segmentData } = await supabase
              .from('customer_segments')
              .select('*')
              .eq('user_id', customer.id)
              .maybeSingle();
            segment = segmentData || undefined;
          }

          // If orders weren't populated from the allOrders query, fetch them
          if (!customer.orders || customer.orders.length === 0) {
            if (customer.id && !customer.id.startsWith('guest-')) {
              const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', customer.id)
                .order('created_at', { ascending: false });
              customer.orders = orders || [];
            } else if (customer.email) {
              // For guest customers, find orders by email in shipping_address
              const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .is('user_id', null)
                .order('created_at', { ascending: false });
              
              // Filter orders by email match
              customer.orders = (orders || []).filter(o => {
                const addr = o.shipping_address as any;
                return addr?.email === customer.email || addr?.Email === customer.email;
              });
            }
          }

          return {
            ...customer,
            segment: segment,
            orders: customer.orders || [],
          };
        })
      );

      // Sort by most recent order or creation date
      customersWithData.sort((a, b) => {
        const aLastOrder = a.orders?.[0]?.created_at || a.created_at;
        const bLastOrder = b.orders?.[0]?.created_at || b.created_at;
        return new Date(bLastOrder).getTime() - new Date(aLastOrder).getTime();
      });

      setCustomers(customersWithData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (customer.phone || '').includes(searchQuery)
  );

  const viewCustomerDetails = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const getSegmentColor = (segment?: string) => {
    const colors: Record<string, string> = {
      retail: 'bg-gray-100 text-gray-800',
      wholesale: 'bg-blue-100 text-blue-800',
      subscriber: 'bg-purple-100 text-purple-800',
      high_frequency: 'bg-green-100 text-green-800',
    };
    return colors[segment || 'retail'] || colors.retail;
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
          <h1 className="font-display text-3xl font-bold">Customers</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>{filteredCustomers.length} customers</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No customers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <p className="font-medium">{customer.full_name || customer.email || 'Guest Customer'}</p>
                      {customer.id?.startsWith('guest-') && (
                        <Badge variant="outline" className="text-xs mt-1">Guest</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.email && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </p>
                        )}
                        {customer.phone && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSegmentColor(customer.segment?.segment || undefined)}>
                        {customer.segment?.segment || 'retail'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.orders?.length || customer.segment?.total_orders || 0}
                    </TableCell>
                    <TableCell>
                      ₹{Number(customer.segment?.total_spent || 
                        customer.orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewCustomerDetails(customer)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.full_name || 'Customer Details'}</DialogTitle>
            <DialogDescription>
              Customer since {selectedCustomer && new Date(selectedCustomer.created_at).toLocaleDateString('en-IN')}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedCustomer.orders?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">
                    ₹{Number(
                      selectedCustomer.orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
                    ).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Badge className={getSegmentColor(selectedCustomer.segment?.segment || undefined)}>
                    {selectedCustomer.segment?.segment || 'retail'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">Segment</p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedCustomer.orders && selectedCustomer.orders.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Shipping Address</h4>
                  {(() => {
                    const latestOrder = selectedCustomer.orders[0];
                    const shippingAddr = latestOrder.shipping_address as any;
                    if (!shippingAddr) return <p className="text-muted-foreground">No address available</p>;
                    
                    return (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium">{shippingAddr.fullName || shippingAddr.full_name || shippingAddr.customerName || 'N/A'}</p>
                        <p className="text-muted-foreground">{shippingAddr.addressLine1 || shippingAddr.address_line1 || ''}</p>
                        <p className="text-muted-foreground">{shippingAddr.addressLine2 || shippingAddr.address_line2 || ''}</p>
                        <p className="text-muted-foreground">
                          {shippingAddr.city || ''} {shippingAddr.state || ''} {shippingAddr.pincode || ''}
                        </p>
                        <p className="text-muted-foreground">Phone: {shippingAddr.phone || shippingAddr.Phone || 'N/A'}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Recent Orders */}
              <div>
                <h4 className="font-semibold mb-3">Recent Orders</h4>
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCustomer.orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{Number(order.total_amount).toLocaleString()}</p>
                          <Badge variant="secondary">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No orders yet</p>
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
