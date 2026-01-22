import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Package, Pause, Play, X, MapPin, Edit, Truck, CreditCard, Clock } from 'lucide-react';
import { format } from 'date-fns';
import DeliveryDatePicker from './DeliveryDatePicker';

interface UserSubscription {
  id: string;
  user_id: string;
  razorpay_subscription_id: string | null;
  plan_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: string;
  preferred_delivery_date: number | null;
  next_delivery_date: string | null;
  next_billing_date: string | null;
  total_deliveries: number;
  completed_deliveries: number;
  shipping_address: Record<string, string>;
  last_payment_status: string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
  };
  variant: {
    id: string;
    weight: number;
    price: number;
  } | null;
  plan: {
    id: string;
    name: string;
    discount_percentage: number;
  };
}

interface SubscriptionOrder {
  id: string;
  subscription_id: string;
  order_id: string;
  billing_cycle: number;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
  order: {
    order_number: string;
    total_amount: number;
    status: string;
  } | null;
}

export function ManageSubscription() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showDeliveryDateDialog, setShowDeliveryDateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionOrder[]>([]);
  const [newDeliveryDate, setNewDeliveryDate] = useState<number>(15);
  const [address, setAddress] = useState<Record<string, string>>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Query subscriptions without relationships first, then fetch related data separately
      const { data: subscriptionsData, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!subscriptionsData) {
        setSubscriptions([]);
        return;
      }

      // Fetch related data for each subscription
      const subscriptionsWithDetails = await Promise.all(
        subscriptionsData.map(async (sub) => {
          const [planResult, productResult, variantResult] = await Promise.all([
            sub.plan_id ? supabase.from('subscription_plans').select('*').eq('id', sub.plan_id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from('products').select('id, name, image_url').eq('id', sub.product_id).maybeSingle(),
            sub.variant_id ? supabase.from('product_variants').select('id, weight, price').eq('id', sub.variant_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);

          return {
            ...sub,
            plan: planResult.data,
            product: productResult.data,
            variant: variantResult.data,
          };
        })
      );

      setSubscriptions(subscriptionsWithDetails as UserSubscription[]);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionHistory = async (subscriptionId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_orders')
        .select(`
          *,
          order:orders(order_number, total_amount, status)
        `)
        .eq('subscription_id', subscriptionId)
        .order('billing_cycle', { ascending: false });

      if (error) throw error;
      setSubscriptionHistory(data as SubscriptionOrder[]);
    } catch (err) {
      console.error('Failed to load subscription history:', err);
      toast.error('Failed to load subscription history');
    }
  };

  const handlePauseResume = async (subscription: UserSubscription) => {
    try {
      const action = subscription.status === 'active' ? 'pause' : 'resume';

      // Use direct fetch with anon key to bypass gateway JWT validation
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key to bypass gateway JWT validation
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          action,
          user_id: user?.id, // Include user_id for server-side validation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update subscription" }));
        throw new Error(errorData?.error || errorData?.details || "Failed to update subscription");
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update subscription');
      }

      toast.success(`Subscription ${action}d successfully`);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to update subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription');
    }
  };

  const handleCancel = async (subscription: UserSubscription) => {
    if (!confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) return;

    try {
      // Use direct fetch with anon key to bypass gateway JWT validation
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key to bypass gateway JWT validation
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          action: 'cancel',
          user_id: user?.id, // Include user_id for server-side validation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cancel subscription" }));
        throw new Error(errorData?.error || errorData?.details || "Failed to cancel subscription");
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  const handleUpdateAddress = async () => {
    if (!selectedSubscription) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          shipping_address: address,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Delivery address updated');
      setShowAddressDialog(false);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to update address:', err);
      toast.error('Failed to update address');
    }
  };

  const handleUpdateDeliveryDate = async () => {
    if (!selectedSubscription) return;

    try {
      const calculateNextDeliveryDate = (dayOfMonth: number): string => {
        const now = new Date();
        const currentDay = now.getDate();
        let deliveryDate: Date;

        if (dayOfMonth > currentDay) {
          deliveryDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
        } else {
          deliveryDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
        }

        return deliveryDate.toISOString().split('T')[0];
      };

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          preferred_delivery_date: newDeliveryDate,
          next_delivery_date: calculateNextDeliveryDate(newDeliveryDate),
          next_billing_date: calculateNextDeliveryDate(newDeliveryDate),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Delivery date updated');
      setShowDeliveryDateDialog(false);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to update delivery date:', err);
      toast.error('Failed to update delivery date');
    }
  };

  const openAddressDialog = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setAddress(subscription.shipping_address || {
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    });
    setShowAddressDialog(true);
  };

  const openDeliveryDateDialog = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setNewDeliveryDate(subscription.preferred_delivery_date || 15);
    setShowDeliveryDateDialog(true);
  };

  const openHistoryDialog = async (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    await fetchSubscriptionHistory(subscription.id);
    setShowHistoryDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading subscriptions...</p>;
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No Active Subscriptions</p>
          <p className="text-sm text-muted-foreground mb-4">
            Start a subscription to enjoy regular coffee deliveries with exclusive benefits
          </p>
          <Button onClick={() => (window.location.href = '/shop')}>Browse Coffee</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {subscriptions.map((subscription) => {
          const price = subscription.variant ? subscription.variant.price : 0;
          const weight = subscription.variant ? subscription.variant.weight : 0;

          return (
            <Card key={subscription.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    {subscription.product.image_url && (
                      <img
                        src={subscription.product.image_url}
                        alt={subscription.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div>
                      <CardTitle>{subscription.product.name}</CardTitle>
                      <CardDescription>
                        {weight}g · Qty {subscription.quantity}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Monthly Price</p>
                    <p className="font-medium text-lg">₹{price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next Delivery
                    </p>
                    <p className="font-medium">
                      {subscription.next_delivery_date
                        ? format(new Date(subscription.next_delivery_date), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Delivery Date
                    </p>
                    <p className="font-medium">
                      {subscription.preferred_delivery_date
                        ? `${subscription.preferred_delivery_date}${
                            subscription.preferred_delivery_date === 1
                              ? 'st'
                              : subscription.preferred_delivery_date === 2
                              ? 'nd'
                              : subscription.preferred_delivery_date === 3
                              ? 'rd'
                              : 'th'
                          } of month`
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Deliveries
                    </p>
                    <p className="font-medium">
                      {subscription.completed_deliveries} / {subscription.total_deliveries}
                    </p>
                  </div>
                </div>

                {subscription.shipping_address && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </p>
                    <div className="text-muted-foreground">
                      <p>{subscription.shipping_address.fullName}</p>
                      <p>{subscription.shipping_address.addressLine1}</p>
                      {subscription.shipping_address.addressLine2 && (
                        <p>{subscription.shipping_address.addressLine2}</p>
                      )}
                      <p>
                        {subscription.shipping_address.city}, {subscription.shipping_address.state} -{' '}
                        {subscription.shipping_address.pincode}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {subscription.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => handlePauseResume(subscription)}>
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                  )}
                  {subscription.status === 'paused' && (
                    <Button size="sm" variant="outline" onClick={() => handlePauseResume(subscription)}>
                      <Play className="h-4 w-4 mr-1" /> Resume
                    </Button>
                  )}
                  {subscription.status !== 'cancelled' && subscription.status !== 'completed' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openDeliveryDateDialog(subscription)}>
                        <Calendar className="h-4 w-4 mr-1" /> Change Date
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAddressDialog(subscription)}>
                        <MapPin className="h-4 w-4 mr-1" /> Update Address
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(subscription)}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openHistoryDialog(subscription)}>
                    <Clock className="h-4 w-4 mr-1" /> History
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDeliveryDateDialog} onOpenChange={setShowDeliveryDateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Delivery Date</DialogTitle>
            <DialogDescription>
              Select a new preferred delivery date for your subscription
            </DialogDescription>
          </DialogHeader>

          <DeliveryDatePicker
            selectedDate={newDeliveryDate}
            onDateChange={setNewDeliveryDate}
            minDate={new Date()}
          />

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeliveryDateDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdateDeliveryDate} className="flex-1">
              Update Delivery Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Delivery Address</DialogTitle>
            <DialogDescription>Update your subscription delivery address</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={address.addressLine2}
                onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input
                id="landmark"
                value={address.landmark}
                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddressDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateAddress} className="flex-1">
                Update Address
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Subscription History</DialogTitle>
            <DialogDescription>
              View your past deliveries and payments for {selectedSubscription?.product.name}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="deliveries" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="deliveries" className="space-y-3 max-h-[400px] overflow-y-auto">
              {subscriptionHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No deliveries yet</p>
              ) : (
                subscriptionHistory.map((history) => (
                  <Card key={history.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Delivery #{history.billing_cycle}
                          </p>
                          {history.order && (
                            <p className="text-sm text-muted-foreground">
                              Order: {history.order.order_number}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(history.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge className={getStatusColor(history.status)}>{history.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-3 max-h-[400px] overflow-y-auto">
              {subscriptionHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payments yet</p>
              ) : (
                subscriptionHistory.map((history) => (
                  <Card key={history.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Payment #{history.billing_cycle}
                          </p>
                          {history.order && (
                            <p className="text-sm font-semibold">
                              ₹{history.order.total_amount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(history.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge className={getStatusColor(history.status)}>{history.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
