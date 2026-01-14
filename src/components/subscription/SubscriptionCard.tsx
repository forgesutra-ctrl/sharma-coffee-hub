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

export function SubscriptionCard({ product, selectedVariant, quantity }: SubscriptionCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

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

    if (data) {
      setPlan(data);
    }
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

    setLoading(true);
    try {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          product_id: product.id,
          variant_id: selectedVariant.id,
          quantity,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
        });

      if (error) throw error;

      toast.success('Subscription created successfully!');
      navigate('/account/subscriptions');
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

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
          Get this coffee delivered monthly and save on every order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Monthly Delivery</p>
              <p className="text-muted-foreground text-xs">Auto-renews</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Package className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Free Shipping</p>
              <p className="text-muted-foreground text-xs">Always</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Skip Anytime</p>
              <p className="text-muted-foreground text-xs">Full control</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Cancel Anytime</p>
              <p className="text-muted-foreground text-xs">No commitment</p>
            </div>
          </div>
        </div>

        {selectedVariant && (
          <div className="pt-3 border-t">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-muted-foreground">Regular Price:</span>
              <span className="text-sm line-through">₹{selectedVariant.price.toFixed(2)}</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium">Subscription Price:</span>
              <span className="text-lg font-bold text-primary">₹{discountedPrice.toFixed(2)}</span>
            </div>
            <div className="text-xs text-center text-green-600 font-medium">
              You save ₹{savings.toFixed(2)} per delivery!
            </div>
          </div>
        )}

        <Button
          onClick={handleSubscribe}
          disabled={loading || !selectedVariant}
          className="w-full"
          size="lg"
        >
          {loading ? 'Creating Subscription...' : 'Subscribe Now'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Manage or cancel your subscription anytime from your account
        </p>
      </CardContent>
    </Card>
  );
}
