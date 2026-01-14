import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple CSV to XLSX converter (generates a basic XLSX without external dependencies)
function generateCSV(data: Record<string, any>[], sheetName: string): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      // Escape quotes and wrap in quotes if contains comma
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return new Response(
        JSON.stringify({ error: 'Month and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get orders for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('payment_status', ['paid', 'advance_paid']);

    if (ordersError) throw ordersError;

    // Calculate metrics
    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
    const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
    const codOrders = orders?.filter(o => o.payment_type === 'cod').length || 0;
    const prepaidOrders = orders?.filter(o => o.payment_type === 'prepaid').length || 0;

    // Orders data
    const ordersData = orders?.map(o => {
      const shippingAddress = o.shipping_address as { fullName?: string; phone?: string } | null;
      return {
        'Order Number': o.order_number,
        'Date': new Date(o.created_at).toLocaleDateString('en-IN'),
        'Customer': shippingAddress?.fullName || 'N/A',
        'Phone': shippingAddress?.phone || 'N/A',
        'Pincode': o.pincode || 'N/A',
        'Region': o.shipping_region || 'N/A',
        'Payment Type': o.payment_type || 'prepaid',
        'Payment Status': o.payment_status || 'pending',
        'Order Status': o.status || 'pending',
        'Subtotal': Number(o.subtotal || 0),
        'Shipping': Number(o.shipping_charge || 0),
        'COD Fee': Number(o.cod_handling_fee || 0),
        'Total': Number(o.total_amount || 0),
        'COD Balance': Number(o.cod_balance || 0),
      };
    }) || [];

    // Product-wise sales
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    orders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const key = `${item.product_name} - ${item.weight}g`;
        if (!productSales[key]) {
          productSales[key] = { quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += Number(item.total_price || 0);
      });
    });

    const productData = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([name, data]) => ({
        'Product': name,
        'Quantity Sold': data.quantity,
        'Revenue': data.revenue,
      }));

    // Daily sales
    const dailySales: Record<string, { orders: number; revenue: number }> = {};
    orders?.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('en-IN');
      if (!dailySales[date]) {
        dailySales[date] = { orders: 0, revenue: 0 };
      }
      dailySales[date].orders += 1;
      dailySales[date].revenue += Number(order.total_amount || 0);
    });

    const dailyData = Object.entries(dailySales).map(([date, data]) => ({
      'Date': date,
      'Orders': data.orders,
      'Revenue': data.revenue,
    }));

    // Summary data
    const summaryData = [
      { 'Metric': 'Report Period', 'Value': `${month}/${year}` },
      { 'Metric': 'Total Orders', 'Value': orders?.length || 0 },
      { 'Metric': 'Total Revenue', 'Value': totalRevenue },
      { 'Metric': 'Average Order Value', 'Value': avgOrderValue.toFixed(2) },
      { 'Metric': 'Prepaid Orders', 'Value': prepaidOrders },
      { 'Metric': 'COD Orders', 'Value': codOrders },
      { 'Metric': 'Karnataka Orders', 'Value': orders?.filter(o => o.shipping_region === 'Karnataka').length || 0 },
      { 'Metric': 'South India Orders', 'Value': orders?.filter(o => o.shipping_region === 'South India').length || 0 },
      { 'Metric': 'Rest of India', 'Value': orders?.filter(o => o.shipping_region === 'Rest of India').length || 0 },
    ];

    // Generate CSV content for all sheets
    const csvContent = [
      '--- SUMMARY ---',
      generateCSV(summaryData, 'Summary'),
      '',
      '--- ORDERS ---',
      generateCSV(ordersData, 'Orders'),
      '',
      '--- PRODUCT SALES ---',
      generateCSV(productData, 'Product Sales'),
      '',
      '--- DAILY SALES ---',
      generateCSV(dailyData, 'Daily Sales'),
    ].join('\n');

    // Return as base64 encoded CSV
    const encoder = new TextEncoder();
    const bytes = encoder.encode(csvContent);
    const base64 = btoa(String.fromCharCode(...bytes));

    return new Response(
      JSON.stringify({ 
        base64,
        filename: `sales-report-${month}-${year}.csv`,
        contentType: 'text/csv'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});