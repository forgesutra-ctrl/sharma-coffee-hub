import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  RefreshCw, 
  Pause,
  Play,
  SkipForward,
  Calendar,
  Package,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Subscription = Tables<'subscriptions'>;

interface ShippingAddress {
  full_name?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'pause' | 'resume' | 'skip';
    subscriptionId: string;
    subscriptionName: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (type: 'pause' | 'resume' | 'skip', subscription: Subscription) => {
    setPendingAction({
      type,
      subscriptionId: subscription.id,
      subscriptionName: subscription.product_name,
    });
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!pendingAction) return;

    setIsProcessing(true);

    try {
      const { type, subscriptionId } = pendingAction;
      let updateData: Partial<Subscription> = {};

      switch (type) {
        case 'pause':
          updateData = { status: 'paused' };
          break;
        case 'resume':
          updateData = { status: 'active' };
          break;
        case 'skip':
          // Calculate next delivery date (skip one cycle)
          const subscription = subscriptions.find(s => s.id === subscriptionId);
          if (subscription?.next_delivery_date) {
            const currentDate = new Date(subscription.next_delivery_date);
            let daysToAdd = 30; // Default monthly
            
            if (subscription.frequency === 'weekly') daysToAdd = 7;
            else if (subscription.frequency === 'biweekly') daysToAdd = 14;
            else if (subscription.frequency === 'bimonthly') daysToAdd = 60;
            
            currentDate.setDate(currentDate.getDate() + daysToAdd);
            updateData = { next_delivery_date: currentDate.toISOString().split('T')[0] };
          }
          break;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) throw error;

      const messages = {
        pause: 'Subscription paused',
        resume: 'Subscription resumed',
        skip: 'Next delivery skipped',
      };
      
      toast.success(messages[type]);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setIsProcessing(false);
      setActionDialogOpen(false);
      setPendingAction(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Every week',
      biweekly: 'Every 2 weeks',
      monthly: 'Every month',
      bimonthly: 'Every 2 months',
    };
    return labels[frequency] || frequency;
  };

  const parseShippingAddress = (address: Json | null): ShippingAddress | null => {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return null;
    return address as ShippingAddress;
  };

  const getActionDialogContent = () => {
    if (!pendingAction) return { title: '', description: '' };

    const content = {
      pause: {
        title: 'Pause Subscription',
        description: `Are you sure you want to pause your ${pendingAction.subscriptionName} subscription? You can resume it anytime.`,
      },
      resume: {
        title: 'Resume Subscription',
        description: `Resume your ${pendingAction.subscriptionName} subscription? Deliveries will continue from the next scheduled date.`,
      },
      skip: {
        title: 'Skip Next Delivery',
        description: `Skip the next delivery of ${pendingAction.subscriptionName}? The following delivery will proceed as scheduled.`,
      },
    };

    return content[pendingAction.type];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage your coffee subscriptions
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No active subscriptions</p>
            <p className="text-sm text-muted-foreground">
              You don't have any subscriptions yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const shippingAddress = parseShippingAddress(subscription.shipping_address);
            const isActive = subscription.status === 'active';
            const isPaused = subscription.status === 'paused';

            return (
              <Card key={subscription.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{subscription.product_name}</CardTitle>
                        <CardDescription>
                          {subscription.weight}g • {subscription.grind_type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(subscription.status || 'active')}>
                      {subscription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subscription Details */}
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-4 h-4" />
                      <span>{getFrequencyLabel(subscription.frequency)}</span>
                      <span className="text-foreground font-medium">
                        • Qty: {subscription.quantity}
                      </span>
                    </div>
                    
                    {subscription.next_delivery_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Next delivery:{' '}
                          <span className="text-foreground font-medium">
                            {new Date(subscription.next_delivery_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                      </div>
                    )}

                    {subscription.total_deliveries !== null && subscription.total_deliveries > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Total deliveries: {subscription.total_deliveries}
                      </p>
                    )}
                  </div>

                  {/* Shipping Address */}
                  {shippingAddress && (
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-muted-foreground">
                        <p className="font-medium text-foreground">{shippingAddress.full_name}</p>
                        <p>
                          {shippingAddress.address_line1}, {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {isActive && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('pause', subscription)}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('skip', subscription)}
                        >
                          <SkipForward className="w-4 h-4 mr-2" />
                          Skip Next
                        </Button>
                      </>
                    )}
                    {isPaused && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAction('resume', subscription)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
