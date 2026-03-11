import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminOrStaffOnly from '@/components/admin/AdminOrStaffOnly';

type FilterType = 'all' | 'action_needed' | 'upcoming' | 'overdue';

interface SubscriberCard {
  id: string;
  user_id: string;
  razorpay_subscription_id: string | null;
  variant_amount: number | null;
  displayAmount: number; // variant_amount ?? product_variants.price
  created_at: string;
  next_delivery_date: string | null;
  shipping_address: Record<string, unknown> | null;
  product_id: string;
  variant_id: string | null;
  // Enriched
  fullName: string;
  email: string;
  phone: string;
  productName: string;
  productWeight: string;
  lastOrder: { order_number: string; created_at: string; status: string } | null;
  cycleStatus: 'all_good' | 'action_needed' | 'upcoming' | 'overdue';
  dueSoon: boolean; // next_delivery_date within next 5 days
  cycleDetail: {
    paymentId?: string;
    amount?: number;
    date?: string;
    orderNumber?: string;
    orderStatus?: string;
    nextDue?: string;
    warning?: string;
  };
}

export default function SubscriptionsPage() {
  const [subscribers, setSubscribers] = useState<SubscriberCard[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<SubscriberCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      // 1. Fetch active subscriptions
      const { data: subs, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, razorpay_subscription_id, variant_amount, created_at, next_delivery_date, shipping_address, product_id, variant_id')
        .eq('status', 'active');

      if (subsError) throw subsError;
      if (!subs || subs.length === 0) {
        setSubscribers([]);
        return;
      }

      const userIds = [...new Set(subs.map((s) => s.user_id))];
      const productIds = [...new Set(subs.map((s) => s.product_id).filter(Boolean))];
      const variantIds = [...new Set(subs.map((s) => s.variant_id).filter(Boolean))];
      const razorpaySubIds = subs.map((s) => s.razorpay_subscription_id).filter(Boolean) as string[];

      // 2. Fetch profiles (email, full_name)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // 2b. Fetch emails from auth.users (RPC) — fallback when profiles.email is empty
      let authEmailMap = new Map<string, string>();
      try {
        const { data: authEmails } = await supabase.rpc('get_user_emails_for_admin', { user_ids: userIds });
        authEmailMap = new Map((authEmails || []).map((r) => [r.user_id, r.email]));
      } catch {
        // RPC may not exist if migration not applied; continue with other sources
      }

      // 3. Fetch products and variants (include price for monthly amount fallback)
      const { data: products } = await supabase.from('products').select('id, name').in('id', productIds);
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, weight, price, product_id')
        .in('id', variantIds);

      const productMap = new Map((products || []).map((p) => [p.id, p]));
      const variantMap = new Map((variants || []).map((v) => [v.id, v]));

      // 4. Fetch last order per user (include shipping_address for email fallback)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, user_id, order_number, created_at, status, shipping_address')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      const lastOrderByUser = new Map<string, { order_number: string; created_at: string; status: string }>();
      const emailFromOrderByUser = new Map<string, string>();
      for (const o of orders || []) {
        if (o.user_id && !lastOrderByUser.has(o.user_id)) {
          lastOrderByUser.set(o.user_id, {
            order_number: o.order_number,
            created_at: o.created_at,
            status: o.status || 'pending',
          });
          const addr = o.shipping_address as Record<string, string> | null;
          const orderEmail = addr?.email || addr?.Email || addr?.customerEmail || '';
          if (orderEmail) emailFromOrderByUser.set(o.user_id, orderEmail);
        }
      }

      // 5. Fetch webhook_logs for invoice.paid / subscription.charged / payment.captured in last 35 days
      const { data: webhookLogs } = await supabase
        .from('webhook_logs')
        .select('id, event_type, payload, created_at')
        .in('event_type', ['invoice.paid', 'subscription.charged', 'payment.captured'])
        .gte('created_at', thirtyFiveDaysAgo.toISOString());

      const paymentIdsFromWebhooks: string[] = [];
      const webhookBySubId = new Map<
        string,
        { paymentId: string; amount: number; date: string }
      >();

      for (const wl of webhookLogs || []) {
        const payload = wl.payload as {
          payload?: {
            invoice?: { entity?: { subscription_id?: string; amount_paid?: number } };
            payment?: { entity?: { id?: string; amount?: number } };
          };
        };
        const inner = payload?.payload;
        const subId = inner?.invoice?.entity?.subscription_id;
        const paymentEntity = inner?.payment?.entity;
        const paymentId = paymentEntity?.id;
        const amountPaid = inner?.invoice?.entity?.amount_paid ?? paymentEntity?.amount ?? 0;
        const amountRupees = amountPaid / 100;

        if (subId && razorpaySubIds.includes(subId)) {
          if (paymentId) {
            paymentIdsFromWebhooks.push(paymentId);
            const existing = webhookBySubId.get(subId);
            if (!existing || new Date(wl.created_at) > new Date(existing.date)) {
              webhookBySubId.set(subId, {
                paymentId,
                amount: amountRupees,
                date: wl.created_at,
              });
            }
          }
        }
      }

      // 6. Fetch orders with razorpay_payment_id matching webhook payments
      const orderByPaymentId = new Map<string, { order_number: string; status: string }>();
      if (paymentIdsFromWebhooks.length > 0) {
        const { data: ordersWithPayment } = await supabase
          .from('orders')
          .select('order_number, status, razorpay_payment_id')
          .in('razorpay_payment_id', paymentIdsFromWebhooks);
        for (const o of ordersWithPayment || []) {
          if (o.razorpay_payment_id) {
            orderByPaymentId.set(o.razorpay_payment_id, {
              order_number: o.order_number,
              status: o.status || 'pending',
            });
          }
        }
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const cards: SubscriberCard[] = subs.map((sub) => {
        const profile = profileMap.get(sub.user_id);
        const shipping = (sub.shipping_address || {}) as Record<string, string>;
        const fullName = shipping?.fullName || profile?.full_name || '—';
        const email = profile?.email || authEmailMap.get(sub.user_id) || shipping?.email || shipping?.Email || shipping?.customerEmail || emailFromOrderByUser.get(sub.user_id) || '—';
        const phone = shipping?.phone || profile?.phone || '—';

        const product = productMap.get(sub.product_id);
        const variant = sub.variant_id ? variantMap.get(sub.variant_id) : null;
        const productName = product?.name || '—';
        const weight = variant?.weight ?? 250;
        const productWeight = `${weight}g`;
        const displayAmount = Number(sub.variant_amount ?? variant?.price ?? 0);

        const lastOrder = lastOrderByUser.get(sub.user_id) ?? null;

        const razorpaySubId = sub.razorpay_subscription_id;
        const webhookPayment = razorpaySubId ? webhookBySubId.get(razorpaySubId) : null;
        const nextDueRaw = sub.next_delivery_date;
        const nextDue = nextDueRaw ? nextDueRaw.split('T')[0] : null;

        let cycleStatus: SubscriberCard['cycleStatus'] = 'upcoming';
        let cycleDetail: SubscriberCard['cycleDetail'] = {};

        if (webhookPayment) {
          const orderForPayment = orderByPaymentId.get(webhookPayment.paymentId);
          if (orderForPayment) {
            cycleStatus = 'all_good';
            cycleDetail = {
              paymentId: webhookPayment.paymentId,
              amount: webhookPayment.amount,
              date: webhookPayment.date,
              orderNumber: orderForPayment.order_number,
              orderStatus: orderForPayment.status,
            };
          } else {
            cycleStatus = 'action_needed';
            cycleDetail = {
              paymentId: webhookPayment.paymentId,
              amount: webhookPayment.amount,
              date: webhookPayment.date,
              warning: 'Payment received but no order created',
            };
          }
        } else {
          // No payment in last 35 days
          if (nextDue) {
            if (nextDue < todayStr) {
              cycleStatus = 'overdue';
              cycleDetail = { nextDue, warning: 'Next delivery date has passed, no payment' };
            } else {
              cycleStatus = 'upcoming';
              cycleDetail = { nextDue };
            }
          } else {
            cycleStatus = 'upcoming';
            cycleDetail = {};
          }
        }

        // Due soon: next_delivery_date within next 5 days (and in future)
        const fiveDaysFromNow = new Date(now);
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
        const fiveDaysStr = fiveDaysFromNow.toISOString().split('T')[0];
        const dueSoon = !!nextDue && nextDue >= todayStr && nextDue <= fiveDaysStr && cycleStatus !== 'overdue';

        return {
          id: sub.id,
          user_id: sub.user_id,
          razorpay_subscription_id: razorpaySubId,
          variant_amount: sub.variant_amount,
          displayAmount,
          created_at: sub.created_at,
          next_delivery_date: nextDue,
          shipping_address: sub.shipping_address,
          product_id: sub.product_id,
          variant_id: sub.variant_id,
          fullName,
          email,
          phone,
          productName,
          productWeight,
          lastOrder,
          cycleStatus,
          dueSoon,
          cycleDetail,
        };
      });

      setSubscribers(cards);
    } catch (err) {
      console.error('Subscriptions fetch error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load subscriptions');
      setSubscribers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    let filtered = subscribers;
    if (filter === 'action_needed') filtered = subscribers.filter((s) => s.cycleStatus === 'action_needed');
    else if (filter === 'upcoming') filtered = subscribers.filter((s) => s.cycleStatus === 'upcoming');
    else if (filter === 'overdue') filtered = subscribers.filter((s) => s.cycleStatus === 'overdue');

    const sortOrder = ['action_needed', 'overdue', 'upcoming', 'all_good'];
    filtered.sort((a, b) => {
      const ai = sortOrder.indexOf(a.cycleStatus);
      const bi = sortOrder.indexOf(b.cycleStatus);
      if (ai !== bi) return ai - bi;
      const da = a.next_delivery_date || '9999-12-31';
      const db = b.next_delivery_date || '9999-12-31';
      return da.localeCompare(db);
    });
    setFilteredSubscribers(filtered);
  }, [subscribers, filter]);

  // Single badge only — priority: Action needed > Overdue > Due Soon > Upcoming
  const getDisplayBadge = (sub: SubscriberCard) => {
    if (sub.cycleStatus === 'action_needed') return <Badge className="bg-red-100 text-red-800">🔴 Action needed</Badge>;
    if (sub.cycleStatus === 'overdue') return <Badge className="bg-yellow-100 text-yellow-800">⚠️ Overdue</Badge>;
    if (sub.dueSoon) return <Badge className="bg-amber-100 text-amber-800">🔔 Due Soon</Badge>;
    if (sub.cycleStatus === 'all_good') return <Badge className="bg-green-100 text-green-800">✅ All good</Badge>;
    if (sub.cycleStatus === 'upcoming') return <Badge className="bg-blue-100 text-blue-800">🟡 Upcoming</Badge>;
    return null;
  };

  if (isLoading && subscribers.length === 0) {
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
          <div>
            <h1 className="font-display text-3xl font-bold">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Active subscribers with payment and order status
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="action_needed">Action Needed</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredSubscribers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active subscriptions found
              </CardContent>
            </Card>
          ) : (
            filteredSubscribers.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg">{sub.fullName}</CardTitle>
                    {getDisplayBadge(sub)}
                  </div>
                  <CardDescription>
                    {sub.email} {sub.phone && `• ${sub.phone}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Product</p>
                      <p>{sub.productName} ({sub.productWeight})</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Monthly amount</p>
                      <p>₹{sub.displayAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Razorpay subscription ID</p>
                      <p className="font-mono text-xs">{sub.razorpay_subscription_id || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Started</p>
                      <p>{new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Last order</p>
                    {sub.lastOrder ? (
                      <p>
                        {sub.lastOrder.order_number} •{' '}
                        {new Date(sub.lastOrder.created_at).toLocaleDateString('en-IN')} •{' '}
                        <Badge variant="secondary" className="text-xs">{sub.lastOrder.status}</Badge>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No orders yet</p>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Current cycle status</p>
                    {sub.cycleDetail.orderNumber && sub.cycleDetail.orderStatus ? (
                      <p className="text-green-600 font-medium">
                        Order {sub.cycleDetail.orderNumber} • {sub.cycleDetail.orderStatus}
                      </p>
                    ) : sub.cycleDetail.warning ? (
                      <p className={sub.cycleStatus === 'action_needed' ? 'text-red-600 font-medium' : 'text-yellow-600'}>
                        ⚠️ {sub.cycleDetail.warning}
                      </p>
                    ) : sub.cycleDetail.nextDue ? (
                      <p className={sub.cycleStatus === 'overdue' ? 'text-yellow-600' : ''}>
                        Next due: {new Date(sub.cycleDetail.nextDue).toLocaleDateString('en-IN')}
                      </p>
                    ) : null}
                    {sub.cycleDetail.paymentId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment {sub.cycleDetail.paymentId} • ₹{sub.cycleDetail.amount?.toLocaleString()} • {sub.cycleDetail.date && new Date(sub.cycleDetail.date).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminOrStaffOnly>
  );
}
