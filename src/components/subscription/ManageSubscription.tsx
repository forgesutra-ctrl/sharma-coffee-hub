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
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
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
      setSubscriptions(data as UserSubscriptionWithDetails[]);
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     PAUSE / RESUME
     ======================= */
  const handlePauseResume = async (subscription: UserSubscriptionWithDetails) => {
    try {
      const action =
        subscription.status === 'active'
          ? 'pause-razorpay-subscription'
          : 'resume-razorpay-subscription';

      await fetch(`/functions/v1/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_subscription_id: subscription.razorpay_subscription_id,
        }),
      });

      const newStatus = subscription.status === 'active' ? 'paused' : 'active';

      await supabase
        .from('user_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id);

      toast.success(`Subscription ${newStatus}`);
      fetchSubscriptions();
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  /* =======================
     CANCEL
     ======================= */
  const handleCancel = async (subscription: UserSubscriptionWithDetails) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      await fetch('/functions/v1/cancel-razorpay-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_subscription_id: subscription.razorpay_subscription_id,
        }),
      });

      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  /* =======================
     ADDRESS UPDATE
     ======================= */
  const handleUpdateAddress = async () => {
    if (!selectedSubscription) return;

    try {
      await supabase
        .from('user_subscriptions')
        .update({ shipping_address: address })
        .eq('id', selectedSubscription.id);

      toast.success('Delivery address updated');
      setShowAddressDialog(false);
      fetchSubscriptions();
    } catch {
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

  /* =======================
     UI STATES
     ======================= */
  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">Loading subscriptions...</p>;
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No Active Subscriptions</p>
          <Button onClick={() => (window.location.href = '/shop')}>Browse Coffee</Button>
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
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{subscription.product.name}</CardTitle>
                    <CardDescription>
                      {subscription.variant?.variant_name} · Qty {subscription.quantity}
                    </CardDescription>
                  </div>
                  <Badge>{subscription.status}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Price per delivery</p>
                    <p className="font-medium">₹{discountedPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next billing</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(subscription.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
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
                  {subscription.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancel(subscription)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  )}
                  {!subscription.shipping_address && (
                    <Button size="sm" variant="outline" onClick={() => openAddressDialog(subscription)}>
                      <MapPin className="h-4 w-4 mr-1" /> Add Address
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
            <DialogDescription>Update the delivery address</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Street"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
            <Input
              placeholder="City"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
            <Input
              placeholder="Pincode"
              value={address.pincode}
              onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
            />
            <Button onClick={handleUpdateAddress} className="w-full">
              Update Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
