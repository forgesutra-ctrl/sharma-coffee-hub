import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  RefreshCw,
  IndianRupee,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Download,
  Boxes,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  isWithinInterval,
  addDays,
} from 'date-fns';

type DateRangePreset = 'today' | 'last7' | 'thisMonth' | 'last30' | 'custom';

function getDateRangeBounds(preset: DateRangePreset, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  if (preset === 'custom' && customStart && customEnd) {
    const s = startOfDay(customStart);
    const e = endOfDay(customEnd);
    return s <= e ? { start: s, end: e } : { start: e, end: s };
  }
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'last7':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last30':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getDaysInRange(start: Date, end: Date): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  let d = new Date(start);
  while (d <= end) {
    days.push({ date: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d') });
    d = addDays(d, 1);
  }
  return days;
}

// Types for API responses (user_subscriptions and subscription_deliveries may not be in generated types)
interface UserSubscription {
  id: string;
  user_id: string;
  status: string;
  variant_amount: number | null;
  product_id: string;
  created_at: string;
  updated_at?: string;
}

interface SubscriptionDelivery {
  id: string;
  subscription_id: string;
  delivery_date: string;
  status: string;
}

interface OrderRow {
  id: string;
  total_amount: number;
  status: string | null;
  created_at: string;
  shipment_created_at: string | null;
  payment_type: string | null;
  payment_status: string | null;
  discount_amount: number | null;
  shipping_region: string | null;
  nimbuspost_courier_name: string | null;
}

interface OrderItemRow {
  product_name: string;
  product_id: string | null;
  quantity: number;
  total_price: number;
  order_id: string;
}

interface ShipmentRow {
  id: string;
  status: string;
  tracking_status: string | null;
  order_id: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

const CHART_COLORS = ['#C8A97E', '#8B7355', '#6B5344', '#A0826D', '#D4B896'];
const PIE_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

export default function AnalyticsPage() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('thisMonth');
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const bounds = getDateRangeBounds(
    dateRangePreset,
    dateRangePreset === 'custom' ? new Date(customStart) : undefined,
    dateRangePreset === 'custom' ? new Date(customEnd) : undefined
  );
  const daysInRange = getDaysInRange(bounds.start, bounds.end);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section 1: Revenue & Sales
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueLastPeriod, setRevenueLastPeriod] = useState(0);
  const [revenueChangePercent, setRevenueChangePercent] = useState(0);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [prepaidVsCod, setPrepaidVsCod] = useState<{ name: string; orders: number; revenue: number }[]>([]);
  const [revenueByRegion, setRevenueByRegion] = useState<{ name: string; value: number }[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Section 2: Order Fulfillment
  const [ordersByStatus, setOrdersByStatus] = useState<{ name: string; value: number }[]>([]);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [cancelledPercent, setCancelledPercent] = useState(0);
  const [avgTimeToShipHours, setAvgTimeToShipHours] = useState<number | null>(null);
  const [pendingShipmentCount, setPendingShipmentCount] = useState(0);
  const [shippedTodayCount, setShippedTodayCount] = useState(0);
  const [shipmentTrackingStatus, setShipmentTrackingStatus] = useState<{ name: string; value: number }[]>([]);
  const [courierBreakdown, setCourierBreakdown] = useState<{ name: string; value: number }[]>([]);

  // Section 3: Subscription Health
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [newSubscriptionsThisMonth, setNewSubscriptionsThisMonth] = useState(0);
  const [cancelledSubscriptionsThisMonth, setCancelledSubscriptionsThisMonth] = useState(0);
  const [churnRate, setChurnRate] = useState<number | null>(null);
  const [subscriptionRevenuePercent, setSubscriptionRevenuePercent] = useState(0);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<
    { customerName: string; product: string; date: string }[]
  >([]);
  const [mrr, setMrr] = useState(0);
  const [avgSubscriptionValue, setAvgSubscriptionValue] = useState(0);

  // Section 4: Customer Analytics
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [newCustomersThisMonth, setNewCustomersThisMonth] = useState(0);
  const [repeatCustomers, setRepeatCustomers] = useState(0);
  const [newVsReturningOrders, setNewVsReturningOrders] = useState<{ firstTime: number; returning: number }>({
    firstTime: 0,
    returning: 0,
  });
  const [customerLtv, setCustomerLtv] = useState(0);
  const [topStates, setTopStates] = useState<{ name: string; count: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; email: string; total: number }[]>([]);
  const [topProductsThisMonth, setTopProductsThisMonth] = useState<{ name: string; quantity: number }[]>([]);
  const [topProductsAllTime, setTopProductsAllTime] = useState<{ name: string; quantity: number }[]>([]);

  // Section 5: Product & Inventory
  const [lowStockVariants, setLowStockVariants] = useState<
    { productName: string; variantLabel: string; stock: number }[]
  >([]);
  const [topCategoriesByRevenue, setTopCategoriesByRevenue] = useState<{ name: string; revenue: number }[]>([]);
  const [subscriptionVsOneTimeProducts, setSubscriptionVsOneTimeProducts] = useState<{
    subscription: number;
    oneTime: number;
  }>({ subscription: 0, oneTime: 0 });

  // Section 6: Payment Health
  const [paymentSuccessRate, setPaymentSuccessRate] = useState<number | null>(null);
  const [webhookSuccessRate, setWebhookSuccessRate] = useState<number | null>(null);
  const [codSummary, setCodSummary] = useState<{ totalOrders: number; totalAmount: number; pendingAmount?: number }>({
    totalOrders: 0,
    totalAmount: 0,
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { start, end } = bounds;
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const sevenDaysFromNow = addDays(now, 7);

      const bufferStart = subMonths(start, 1);
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(
          'id, total_amount, status, created_at, shipment_created_at, user_id, shipping_address, payment_type, payment_status, discount_amount, shipping_region, nimbuspost_courier_name'
        )
        .gte('created_at', bufferStart.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;
      const ordersList = (orders || []) as (OrderRow & { shipping_address?: Record<string, unknown> | null })[];

      const ordersInRange = ordersList.filter((o) =>
        isWithinInterval(new Date(o.created_at), { start, end })
      );

      const lastPeriodStart = subMonths(start, 1);
      const lastPeriodEnd = subMonths(end, 1);
      const lastPeriodOrders = ordersList.filter((o) =>
        isWithinInterval(new Date(o.created_at), { start: lastPeriodStart, end: lastPeriodEnd })
      );

      const revTotal = ordersInRange.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const revLast = lastPeriodOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      setRevenueTotal(revTotal);
      setRevenueLastPeriod(revLast);
      setRevenueChangePercent(revLast > 0 ? ((revTotal - revLast) / revLast) * 100 : revTotal > 0 ? 100 : 0);

      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      daysInRange.forEach((d) => (dailyMap[d.date] = { revenue: 0, orders: 0 }));
      ordersInRange.forEach((o) => {
        const key = format(new Date(o.created_at), 'yyyy-MM-dd');
        if (dailyMap[key]) {
          dailyMap[key].revenue += Number(o.total_amount || 0);
          dailyMap[key].orders += 1;
        }
      });
      setDailyData(
        daysInRange.map((d) => ({
          date: d.label,
          revenue: dailyMap[d.date]?.revenue ?? 0,
          orders: dailyMap[d.date]?.orders ?? 0,
        }))
      );

      const grossRev = ordersInRange.reduce((s, o) => s + Number(o.total_amount || 0) + Number(o.discount_amount || 0), 0);
      const discountTotal = ordersInRange.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
      setTotalDiscount(discountTotal);
      setDiscountPercent(grossRev > 0 ? (discountTotal / grossRev) * 100 : 0);

      setAvgOrderValue(ordersInRange.length ? revTotal / ordersInRange.length : 0);
      setTotalOrders(ordersInRange.length);

      const prepaid = ordersInRange.filter((o) => o.payment_type === 'prepaid');
      const cod = ordersInRange.filter((o) => o.payment_type === 'cod');
      setPrepaidVsCod([
        { name: 'Prepaid', orders: prepaid.length, revenue: prepaid.reduce((s, o) => s + Number(o.total_amount || 0), 0) },
        { name: 'COD', orders: cod.length, revenue: cod.reduce((s, o) => s + Number(o.total_amount || 0), 0) },
      ]);

      const regionMap: Record<string, number> = {};
      ordersInRange.forEach((o) => {
        const r = o.shipping_region || 'Unknown';
        regionMap[r] = (regionMap[r] || 0) + Number(o.total_amount || 0);
      });
      setRevenueByRegion(
        Object.entries(regionMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))
      );

      const statusCounts: Record<string, number> = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };
      ordersInRange.forEach((o) => {
        const st = o.status || 'pending';
        if (statusCounts[st] !== undefined) statusCounts[st]++;
      });
      setOrdersByStatus(
        Object.entries(statusCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );
      const cancelled = statusCounts.cancelled || 0;
      setCancelledCount(cancelled);
      setCancelledPercent(ordersInRange.length ? (cancelled / ordersInRange.length) * 100 : 0);

      const shippedOrders = ordersInRange.filter(
        (o) => o.shipment_created_at && ['shipped', 'delivered'].includes(o.status || '')
      );
      let totalHours = 0;
      shippedOrders.forEach((o) => {
        totalHours += (new Date(o.shipment_created_at!).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
      });
      setAvgTimeToShipHours(shippedOrders.length ? Math.round((totalHours / shippedOrders.length) * 10) / 10 : null);

      const pendingShipment = ordersInRange.filter(
        (o) => ['confirmed', 'processing'].includes(o.status || '') && !o.shipment_created_at
      );
      setPendingShipmentCount(pendingShipment.length);

      const todayStart = startOfDay(now);
      const shippedToday = ordersInRange.filter(
        (o) =>
          o.shipment_created_at &&
          new Date(o.shipment_created_at) >= todayStart &&
          ['shipped', 'delivered'].includes(o.status || '')
      );
      setShippedTodayCount(shippedToday.length);

      const courierMap: Record<string, number> = {};
      ordersInRange.forEach((o) => {
        const c = o.nimbuspost_courier_name || 'Not assigned';
        courierMap[c] = (courierMap[c] || 0) + 1;
      });
      setCourierBreakdown(Object.entries(courierMap).map(([name, value]) => ({ name, value })));

      const orderIdsInRange = ordersInRange.map((o) => o.id);
      if (orderIdsInRange.length > 0) {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, status, tracking_status, order_id')
          .in('order_id', orderIdsInRange);

        const statusMap: Record<string, number> = { delivered: 0, in_transit: 0, out_for_delivery: 0, other: 0 };
        (shipments || []).forEach((s: ShipmentRow) => {
          const st = (s.tracking_status || s.status || '').toLowerCase();
          if (st.includes('delivered')) statusMap.delivered++;
          else if (st.includes('transit') || st.includes('shipped')) statusMap.in_transit++;
          else if (st.includes('out for delivery') || st.includes('out_for_delivery')) statusMap.out_for_delivery++;
          else statusMap.other++;
        });
        setShipmentTrackingStatus([
          { name: 'Delivered', value: statusMap.delivered },
          { name: 'In Transit', value: statusMap.in_transit },
          { name: 'Out for Delivery', value: statusMap.out_for_delivery },
          { name: 'Other', value: statusMap.other },
        ]);
      } else {
        setShipmentTrackingStatus([]);
      }

      try {
        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('id, status, variant_amount, created_at, updated_at, product_id');

        if (subs) {
          const subsList = subs as UserSubscription[];
          const active = subsList.filter((s) => s.status === 'active');
          setActiveSubscriptions(active.length);

          const newThisMonth = subsList.filter((s) =>
            isWithinInterval(new Date(s.created_at), { start: thisMonthStart, end: thisMonthEnd })
          ).length;
          setNewSubscriptionsThisMonth(newThisMonth);

          const cancelledThisMonth = subsList.filter(
            (s) =>
              s.status === 'cancelled' &&
              isWithinInterval(new Date(s.updated_at || s.created_at), { start: thisMonthStart, end: thisMonthEnd })
          ).length;
          setCancelledSubscriptionsThisMonth(cancelledThisMonth);

          const activePlusCancelled = active.length + cancelledThisMonth;
          setChurnRate(activePlusCancelled > 0 ? (cancelledThisMonth / activePlusCancelled) * 100 : null);

          const mrrSum = active.reduce((s, sub) => s + Number(sub.variant_amount || 0), 0);
          setMrr(mrrSum);
          setAvgSubscriptionValue(active.length ? mrrSum / active.length : 0);

          const { data: subOrders } = await supabase
            .from('subscription_orders')
            .select('order_id')
            .not('order_id', 'is', null);

          const subOrderIds = new Set((subOrders || []).map((so: { order_id: string }) => so.order_id));
          const subRev = ordersInRange
            .filter((o) => subOrderIds.has(o.id))
            .reduce((s, o) => s + Number(o.total_amount || 0), 0);
          setSubscriptionRevenuePercent(revTotal > 0 ? (subRev / revTotal) * 100 : 0);

          const { data: deliveries } = await supabase
            .from('subscription_deliveries')
            .select('id, subscription_id, delivery_date, status')
            .eq('status', 'scheduled')
            .gte('delivery_date', format(now, 'yyyy-MM-dd'))
            .lte('delivery_date', format(sevenDaysFromNow, 'yyyy-MM-dd'))
            .order('delivery_date', { ascending: true })
            .limit(20);

          if (deliveries && deliveries.length > 0) {
            const subIds = [...new Set((deliveries as SubscriptionDelivery[]).map((d) => d.subscription_id))];
            const { data: subsWithUsers } = await supabase
              .from('user_subscriptions')
              .select('id, user_id, product_id')
              .in('id', subIds);

            const { data: prods } = await supabase.from('products').select('id, name').in('id', (subsWithUsers || []).map((s: { product_id: string }) => s.product_id));
            const productMap = new Map((prods || []).map((p: { id: string; name: string }) => [p.id, p.name]));
            const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', (subsWithUsers || []).map((s: { user_id: string }) => s.user_id));
            const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || 'Unknown']));
            const subMap = new Map((subsWithUsers || []).map((s: { id: string; user_id: string; product_id: string }) => [s.id, { userId: s.user_id, productId: s.product_id }]));

            setUpcomingDeliveries(
              (deliveries as SubscriptionDelivery[]).map((d) => {
                const info = subMap.get(d.subscription_id);
                return {
                  customerName: info ? profileMap.get(info.userId) || 'Unknown' : 'Unknown',
                  product: info ? productMap.get(info.productId) || '—' : '—',
                  date: d.delivery_date,
                };
              })
            );
          } else {
            setUpcomingDeliveries([]);
          }
        } else {
          setActiveSubscriptions(0);
          setNewSubscriptionsThisMonth(0);
          setCancelledSubscriptionsThisMonth(0);
          setChurnRate(null);
          setMrr(0);
          setAvgSubscriptionValue(0);
          setSubscriptionRevenuePercent(0);
          setUpcomingDeliveries([]);
        }
      } catch {
        setActiveSubscriptions(0);
        setNewSubscriptionsThisMonth(0);
        setCancelledSubscriptionsThisMonth(0);
        setChurnRate(null);
        setMrr(0);
        setAvgSubscriptionValue(0);
        setSubscriptionRevenuePercent(0);
        setUpcomingDeliveries([]);
      }

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, created_at');
      const profilesList = (profiles || []) as ProfileRow[];
      setTotalCustomers(profilesList.length);
      setNewCustomersThisMonth(
        profilesList.filter((p) => isWithinInterval(new Date(p.created_at), { start: thisMonthStart, end: thisMonthEnd })).length
      );

      const orderCountByUser: Record<string, number> = {};
      const spendByUser: Record<string, number> = {};
      ordersList.forEach((o) => {
        const uid = o.user_id || 'guest';
        orderCountByUser[uid] = (orderCountByUser[uid] || 0) + 1;
        if (o.user_id) {
          spendByUser[o.user_id] = (spendByUser[o.user_id] || 0) + Number(o.total_amount || 0);
        }
      });
      setRepeatCustomers(Object.entries(orderCountByUser).filter(([uid, c]) => uid !== 'guest' && c > 1).length);

      const seenUserIds = new Set<string>();
      let firstTime = 0, returning = 0;
      const sortedOrders = [...ordersList].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      sortedOrders.forEach((o) => {
        if (!o.user_id) return;
        if (!seenUserIds.has(o.user_id)) {
          seenUserIds.add(o.user_id);
          if (isWithinInterval(new Date(o.created_at), { start, end })) firstTime++;
        } else {
          if (isWithinInterval(new Date(o.created_at), { start, end })) returning++;
        }
      });
      setNewVsReturningOrders({ firstTime, returning });

      const customersWithOrders = Object.keys(spendByUser).length;
      const totalSpend = Object.values(spendByUser).reduce((a, b) => a + b, 0);
      setCustomerLtv(customersWithOrders ? totalSpend / customersWithOrders : 0);

      const stateMap: Record<string, number> = {};
      ordersInRange.forEach((o) => {
        const addr = o.shipping_address as { state?: string } | null;
        const st = addr?.state || 'Unknown';
        stateMap[st] = (stateMap[st] || 0) + 1;
      });
      setTopStates(
        Object.entries(stateMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      );

      const nameFromOrder = (addr: Record<string, unknown> | null | undefined) =>
        addr ? (addr.fullName || addr.full_name || addr.customerName || addr.name) as string | null : null;
      const orderNameByUser: Record<string, string> = {};
      ordersList.forEach((o) => {
        if (!o.user_id) return;
        const name = nameFromOrder(o.shipping_address as Record<string, unknown> | null);
        if (name && name !== 'Guest Customer') orderNameByUser[o.user_id] = name;
      });
      const profileMap = new Map(profilesList.map((p) => [p.id, { name: p.full_name || '', email: p.email || '' }]));
      const topUserIds = Object.entries(spendByUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
      setTopCustomers(
        topUserIds.map((id) => {
          const p = profileMap.get(id) || { name: '', email: '' };
          return { name: p.name || orderNameByUser[id] || p.email || 'Unknown', email: p.email, total: spendByUser[id] };
        })
      );

      if (ordersInRange.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_name, quantity, order_id')
          .in('order_id', ordersInRange.map((o) => o.id));
        const productQty: Record<string, number> = {};
        (orderItems || []).forEach((item: OrderItemRow) => {
          productQty[item.product_name] = (productQty[item.product_name] || 0) + item.quantity;
        });
        setTopProductsThisMonth(
          Object.entries(productQty)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }))
        );
      } else {
        setTopProductsThisMonth([]);
      }

      const { data: allOrderItems } = await supabase.from('order_items').select('product_name, quantity');
      const allProductQty: Record<string, number> = {};
      (allOrderItems || []).forEach((item: OrderItemRow) => {
        allProductQty[item.product_name] = (allProductQty[item.product_name] || 0) + item.quantity;
      });
      setTopProductsAllTime(
        Object.entries(allProductQty)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, quantity]) => ({ name, quantity }))
      );

      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, weight, stock_quantity')
        .lt('stock_quantity', 10)
        .not('stock_quantity', 'is', null);

      const productIds = [...new Set((variants || []).map((v: { product_id: string }) => v.product_id))];
      const { data: prods } = await supabase.from('products').select('id, name').in('id', productIds);
      const prodMap = new Map((prods || []).map((p: { id: string; name: string }) => [p.id, p.name]));
      setLowStockVariants(
        (variants || []).map((v: { product_id: string; weight: number; stock_quantity: number | null }) => ({
          productName: prodMap.get(v.product_id) || 'Unknown',
          variantLabel: `${v.weight}g`,
          stock: v.stock_quantity ?? 0,
        }))
      );

      if (ordersInRange.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, total_price')
          .in('order_id', ordersInRange.map((o) => o.id));
        const { data: prodsWithCat } = await supabase.from('products').select('id, category');
        const catMap = new Map((prodsWithCat || []).map((p: { id: string; category: string }) => [p.id, p.category]));
        const catRevenue: Record<string, number> = {};
        (items || []).forEach((item: { product_id: string | null; total_price: number }) => {
          const cat = item.product_id ? (catMap.get(item.product_id) || 'Other') : 'Other';
          catRevenue[cat] = (catRevenue[cat] || 0) + item.total_price;
        });
        setTopCategoriesByRevenue(
          Object.entries(catRevenue)
            .sort((a, b) => b[1] - a[1])
            .map(([name, revenue]) => ({ name, revenue }))
        );
      } else {
        setTopCategoriesByRevenue([]);
      }

      const { data: subOrderRows } = await supabase.from('subscription_orders').select('order_id');
      const subOrderIdSet = new Set((subOrderRows || []).map((r: { order_id: string }) => r.order_id));
      const { data: allItems } = await supabase.from('order_items').select('order_id');
      let subQty = 0, oneTimeQty = 0;
      (allItems || []).forEach((item: { order_id: string }) => {
        if (subOrderIdSet.has(item.order_id)) subQty++;
        else oneTimeQty++;
      });
      setSubscriptionVsOneTimeProducts({ subscription: subQty, oneTime: oneTimeQty });

      const paid = ordersInRange.filter((o) => o.payment_status === 'paid').length;
      const failed = ordersInRange.filter((o) => o.payment_status === 'failed').length;
      const totalWithStatus = paid + failed;
      setPaymentSuccessRate(totalWithStatus ? (paid / totalWithStatus) * 100 : null);

      try {
        const { data: webhookLogs } = await supabase
          .from('webhook_logs')
          .select('processed, error')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        const logs = webhookLogs || [];
        const success = logs.filter((l: { processed: boolean; error: string | null }) => l.processed && !l.error).length;
        setWebhookSuccessRate(logs.length ? (success / logs.length) * 100 : null);
      } catch {
        setWebhookSuccessRate(null);
      }

      const codOrders = ordersInRange.filter((o) => o.payment_type === 'cod');
      const codAmount = codOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const codDelivered = codOrders.filter((o) => o.status === 'delivered');
      const codPending = codAmount - codDelivered.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      setCodSummary({ totalOrders: codOrders.length, totalAmount: codAmount, pendingAmount: codPending });

      setLastRefreshed(new Date());
    } catch (err: unknown) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [bounds.start.getTime(), bounds.end.getTime()]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['Analytics Export', format(new Date(), 'yyyy-MM-dd HH:mm')],
      ['Date Range', `${format(bounds.start, 'PP')} - ${format(bounds.end, 'PP')}`],
      [],
      ['Revenue & Sales', '', ''],
      ['Total Revenue', `₹${revenueTotal.toLocaleString()}`, ''],
      ['Total Orders', String(totalOrders), ''],
      ['Avg Order Value', `₹${avgOrderValue.toLocaleString()}`, ''],
      ['Total Discount', `₹${totalDiscount.toLocaleString()}`, `${discountPercent.toFixed(1)}%`],
      [],
      ['Order Fulfillment', '', ''],
      ['Cancelled Orders', String(cancelledCount), `${cancelledPercent.toFixed(1)}%`],
      ['Pending Shipment', String(pendingShipmentCount), ''],
      [],
      ['Subscription Health', '', ''],
      ['Active Subscriptions', String(activeSubscriptions), ''],
      ['MRR', `₹${mrr.toLocaleString()}`, ''],
      ['Churn Rate', churnRate != null ? `${churnRate.toFixed(1)}%` : '—', ''],
      [],
      ['Customer Analytics', '', ''],
      ['Total Customers', String(totalCustomers), ''],
      ['Customer LTV', `₹${customerLtv.toLocaleString()}`, ''],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !lastRefreshed) {
    return (
      <SuperAdminOnly>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SuperAdminOnly>
    );
  }

  return (
    <SuperAdminOnly>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-1">
                {lastRefreshed ? `Last refreshed: ${format(lastRefreshed, 'PPp')}` : 'Loading...'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={dateRangePreset}
                onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              {dateRangePreset === 'custom' && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing data from {format(bounds.start, 'PP')} to {format(bounds.end, 'PP')}
          </p>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Revenue & Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              Revenue & Sales
            </CardTitle>
            <CardDescription>Revenue, orders, and payment breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <p className="text-sm text-muted-foreground">Total revenue</p>
                <p className="text-2xl font-bold">₹{revenueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <p className={`text-sm ${revenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueChangePercent >= 0 ? '+' : ''}{revenueChangePercent.toFixed(1)}% vs previous period
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg order value</p>
                <p className="text-2xl font-bold">₹{avgOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Discount impact</p>
                <p className="text-2xl font-bold">₹{totalDiscount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{discountPercent.toFixed(1)}% of gross</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[280px]">
                <p className="text-sm font-medium mb-2">Prepaid vs COD</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepaidVsCod} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill={CHART_COLORS[0]} name="Orders" />
                    <Bar dataKey="revenue" fill={CHART_COLORS[1]} name="Revenue (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[280px]">
                <p className="text-sm font-medium mb-2">Revenue by region</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByRegion}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueByRegion.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="h-[300px]">
              <p className="text-sm font-medium mb-2">Daily orders & revenue</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Order Fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Order Fulfillment
            </CardTitle>
            <CardDescription>Order status, shipments, and couriers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <p className="text-sm text-muted-foreground">Avg. time to ship</p>
                <p className="text-2xl font-bold">{avgTimeToShipHours != null ? `${avgTimeToShipHours}h` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending shipment</p>
                <p className="text-2xl font-bold">
                  <Link to="/admin/orders" className="text-primary hover:underline">{pendingShipmentCount}</Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shipped today</p>
                <p className="text-2xl font-bold">{shippedTodayCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold">{cancelledCount}</p>
                <p className="text-sm text-muted-foreground">{cancelledPercent.toFixed(1)}% of total</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[260px]">
                <p className="text-sm font-medium mb-2">Order status</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {ordersByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Shipment tracking status</p>
                  {shipmentTrackingStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shipments in range</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {shipmentTrackingStatus.map((s, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{s.name}</span>
                          <span className="font-medium">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Courier breakdown</p>
                  {courierBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {courierBreakdown.map((c, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{c.name}</span>
                          <span className="font-medium">{c.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Subscription Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription Health
            </CardTitle>
            <CardDescription>MRR, churn, and upcoming deliveries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div>
                <p className="text-sm text-muted-foreground">Active subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New this month</p>
                <p className="text-2xl font-bold">{newSubscriptionsThisMonth}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelled this month</p>
                <p className="text-2xl font-bold">{cancelledSubscriptionsThisMonth}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Churn rate</p>
                <p className="text-2xl font-bold">{churnRate != null ? `${churnRate.toFixed(1)}%` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold">₹{mrr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg subscription value</p>
                <p className="text-2xl font-bold">₹{avgSubscriptionValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subscription revenue share</p>
                <p className="text-2xl font-bold">{subscriptionRevenuePercent.toFixed(1)}%</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Upcoming deliveries (next 7 days)</p>
              {upcomingDeliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deliveries</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Delivery date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingDeliveries.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.customerName}</TableCell>
                        <TableCell>{d.product}</TableCell>
                        <TableCell>{format(new Date(d.date), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Customer Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Customer Analytics
            </CardTitle>
            <CardDescription>Customers, LTV, and geography</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <p className="text-sm text-muted-foreground">Total customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New this month</p>
                <p className="text-2xl font-bold">{newCustomersThisMonth}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Repeat customers</p>
                <p className="text-2xl font-bold">{repeatCustomers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New vs returning orders</p>
                <p className="text-2xl font-bold">{newVsReturningOrders.firstTime} / {newVsReturningOrders.returning}</p>
                <p className="text-sm text-muted-foreground">first-time / returning</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer LTV</p>
                <p className="text-2xl font-bold">₹{customerLtv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">Top 5 states by orders</p>
                {topStates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topStates.map((s, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="font-medium">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top 5 customers by spend</p>
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topCustomers.map((c, i) => (
                      <li key={i} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          {c.email && <span className="text-muted-foreground block text-xs">{c.email}</span>}
                        </div>
                        <span className="font-medium">₹{c.total.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">Top 5 products (date range)</p>
                {topProductsThisMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topProductsThisMonth.map((p, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-medium">{p.quantity} sold</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top 5 products (all time)</p>
                {topProductsAllTime.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topProductsAllTime.map((p, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-medium">{p.quantity} sold</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Product & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-primary" />
              Product & Inventory
            </CardTitle>
            <CardDescription>Stock alerts and category performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-2">Low stock alerts (&lt; 10 units)</p>
              {lowStockVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low stock items</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockVariants.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>{v.productName}</TableCell>
                        <TableCell>{v.variantLabel}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{v.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">Top categories by revenue</p>
                {topCategoriesByRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topCategoriesByRevenue.map((c, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{c.name}</span>
                        <span className="font-medium">₹{c.revenue.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Subscription vs one-time (order items)</p>
                <p className="text-sm text-muted-foreground">
                  Subscription: {subscriptionVsOneTimeProducts.subscription} • One-time: {subscriptionVsOneTimeProducts.oneTime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Payment Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Payment Health
            </CardTitle>
            <CardDescription>Payment success and webhook status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment success rate</p>
                <p className="text-2xl font-bold">{paymentSuccessRate != null ? `${paymentSuccessRate.toFixed(1)}%` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Webhook success rate</p>
                <p className="text-2xl font-bold">{webhookSuccessRate != null ? `${webhookSuccessRate.toFixed(1)}%` : '—'}</p>
                <p className="text-xs text-muted-foreground">(may require admin access)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COD orders</p>
                <p className="text-2xl font-bold">{codSummary.totalOrders}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COD total / pending</p>
                <p className="text-2xl font-bold">₹{codSummary.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  Pending: ₹{(codSummary.pendingAmount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminOnly>
  );
}
