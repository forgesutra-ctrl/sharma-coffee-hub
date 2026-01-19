import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Package, Truck, Tag } from 'lucide-react';
import type { ProductV2, ProductVariant, SubscriptionPlan } from '@/types';

interface SubscriptionCardProps {
  product: ProductV2;
  selectedVariant: ProductVariant | null;
  quantity: number;
}

export function SubscriptionCard({
  product,
  selectedVariant,
  quantity,
}: SubscriptionCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

  // NEW: delivery day (1–28)
  const [deliveryDay, setDeliveryDay] = useState<number>(1);

  useEffect(() => {
    fetchSubscriptionPlan();
  }, []);

  const fetchSubscriptionPlan = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .eq('billing_cycle', 'monthly')
      .maybeSingle();

    if (data) setPlan(data);
  };

  if (!product.subscription_eligible || !plan) {
    return null;
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      navigate('/auth');
      return;
    }

    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    if (!plan.razorpay_plan_id) {
      toast.error('Subscription plan not configured');
      return;
    }

    setLoading(true);

    try {
      /* 1️⃣ CREATE RAZORPAY SUBSCRIPTION */
      const response = await fetch(
        '/functions/v1/create-razorpay-subscription',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_plan_id: plan.razorpay_plan_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Razorpay subscription');
      }

      const { subscription_id } = await response.json();

      /* 2️⃣ SAVE SUBSCRIPTION IN SUPABASE */
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          razorpay_subscription_id: subscription_id,
          product_id: product.id,
          variant_id: selectedVariant.id,
          quantity,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString().split('T')[0],

          // NEW: save preferred delivery day
          delivery_day: deliveryDay,
        });

      if (error) throw error;

      toast.success('Subscription activated successfully');
      navigate('/account/subscriptions');
    } catch (error) {
      console.error(error);
      toast.error('Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  const isPlanConfigured = !!plan.razorpay_plan_id;

  const discountedPrice = selectedVariant
    ? selectedVariant.price * (1 - plan.discount_percentage / 100)
    : 0;

  const savings = selectedVariant
    ? selectedVariant.price - discountedPrice
    : 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subscribe & Save</CardTitle>
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            {plan.discount_percentage}% OFF
          </Badge>
        </div>
        <CardDescription>
          Monthly delivery with subscriber benefits
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* BENEFITS */}
        <div className="grid grid-cols-2 gap-3">
          <Feature icon={<Calendar />} title="Monthly Delivery" desc="Auto-renews" />
          <Feature icon={<Package />} title="Free Shipping" desc="Always" />
          <Feature icon={<Truck />} title="Skip Anytime" desc="Full control" />
          <Feature icon={<Tag />} title="Cancel Anytime" desc="No commitment" />
        </div>

        {/* NEW: DELIVERY DAY SELECTOR */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Preferred delivery day (every month)
          </label>
          <select
            value={deliveryDay}
            onChange={(e) => setDeliveryDay(Number(e.target.value))}
            className="w-full border rounded px-2 py-2"
          >
            {[...Array(28)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* PRICING */}
        {selectedVariant && (
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Regular Price</span>
              <span className="line-through">
                ₹{selectedVariant.price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium mb-2">
              <span>Subscription Price</span>
              <span className="text-primary text-lg">
                ₹{discountedPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-center text-green-600">
              You save ₹{savings.toFixed(2)} per delivery
            </p>
          </div>
        )}

        <Button
          onClick={handleSubscribe}
          disabled={loading || !selectedVariant || !isPlanConfigured}
          className="w-full"
          size="lg"
        >
          {loading ? 'Creating Subscription…' : 'Subscribe Now'}
        </Button>

        {!isPlanConfigured && (
          <p className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
            Subscription temporarily unavailable for this product.
          </p>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Manage or cancel your subscription anytime from your account
        </p>
      </CardContent>
    </Card>
  );
}

/* Small UI helper */
function Feature({ icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-4 w-4 text-primary mt-0.5">{icon}</div>
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </div>
  );
}
