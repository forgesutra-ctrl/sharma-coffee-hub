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
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';

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
      // Fetch profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch segments for each customer
      const customersWithData: CustomerData[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: segment } = await supabase
            .from('customer_segments')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

          return {
            ...profile,
            segment: segment || undefined,
            orders: orders || [],
          };
        })
      );

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
    <SuperAdminOnly>
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
                      <p className="font-medium">{customer.full_name || 'No name'}</p>
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
                    <TableCell>{customer.segment?.total_orders || customer.orders?.length || 0}</TableCell>
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
    </SuperAdminOnly>
  );
}
