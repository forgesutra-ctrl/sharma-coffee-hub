import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Package, Pause, Play, X, MapPin, Edit } from 'lucide-react';
import type { UserSubscriptionWithDetails, ShippingAddress } from '@/types';

export function ManageSubscription() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscriptionWithDetails | null>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: subs, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          product:products(*),
          variant:product_variants(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubscriptions(subs as UserSubscriptionWithDetails[]);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async (subscription: UserSubscriptionWithDetails) => {
    const newStatus = subscription.status === 'active' ? 'paused' : 'active';

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success(`Subscription ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully`);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const handleCancel = async (subscription: UserSubscriptionWithDetails) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Subscription cancelled successfully');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const handleUpdateAddress = async () => {
    if (!selectedSubscription) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ shipping_address: address })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Delivery address updated successfully');
      setShowAddressDialog(false);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const openAddressDialog = (subscription: UserSubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setAddress(subscription.shipping_address || {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
    setShowAddressDialog(true);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Active Subscriptions</p>
            <p className="text-muted-foreground mb-4">
              Subscribe to your favorite coffee and get it delivered monthly with discounts!
            </p>
            <Button onClick={() => window.location.href = '/shop'}>
              Browse Coffee
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {subscriptions.map((subscription) => {
          const discountedPrice = subscription.variant
            ? subscription.variant.price * (1 - subscription.plan.discount_percentage / 100)
            : 0;

          return (
            <Card key={subscription.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{subscription.product.name}</CardTitle>
                    <CardDescription>
                      {subscription.variant?.variant_name} - Qty: {subscription.quantity}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      subscription.status === 'active'
                        ? 'default'
                        : subscription.status === 'paused'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {subscription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{subscription.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-medium text-green-600">
                      {subscription.plan.discount_percentage}% OFF
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price per delivery</p>
                    <p className="font-medium">₹{discountedPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next billing date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(subscription.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {subscription.shipping_address && (
                  <div className="pt-3 border-t">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Delivery Address
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAddressDialog(subscription)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <p className="text-sm">
                      {subscription.shipping_address.street}, {subscription.shipping_address.city},{' '}
                      {subscription.shipping_address.state} - {subscription.shipping_address.pincode}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  {subscription.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseResume(subscription)}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  {subscription.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseResume(subscription)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  {subscription.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(subscription)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  {!subscription.shipping_address && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddressDialog(subscription)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Add Address
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Address</DialogTitle>
            <DialogDescription>
              Update the delivery address for this subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Textarea
                id="street"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="House/Flat No., Building, Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleUpdateAddress} className="w-full">
              Update Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
