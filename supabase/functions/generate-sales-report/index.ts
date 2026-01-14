import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Verify JWT and check user role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin or admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole || (userRole.role !== 'super_admin' && userRole.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin privileges required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { month, year } = await req.json();

    if (!month || !year) {
      return new Response(
        JSON.stringify({ error: 'Month and year are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get orders for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Calculate metrics
    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
    const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
    const codOrders = orders?.filter(o => o.payment_type === 'cod').length || 0;
    const prepaidOrders = orders?.filter(o => o.payment_type === 'prepaid').length || 0;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Sharma Coffee Works - Sales Report'],
      [`Report Period: ${getMonthName(month)} ${year}`],
      [''],
      ['Metric', 'Value'],
      ['Total Orders', orders?.length || 0],
      ['Total Revenue', `₹${totalRevenue.toFixed(2)}`],
      ['Average Order Value', `₹${avgOrderValue.toFixed(2)}`],
      ['Prepaid Orders', prepaidOrders],
      ['COD Orders', codOrders],
      [''],
      ['Regional Breakdown'],
      ['Karnataka Orders', orders?.filter(o => o.shipping_region === 'Karnataka').length || 0],
      ['South India Orders', orders?.filter(o => o.shipping_region === 'South India').length || 0],
      ['Rest of India', orders?.filter(o => o.shipping_region === 'Rest of India').length || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Orders Sheet with detailed information
    const ordersData = orders?.map(o => {
      const shippingAddress = o.shipping_address as { fullName?: string; email?: string; phone?: string } | null;
      const items = o.order_items?.map((item: any) => `${item.product_name} (${item.weight}g) x${item.quantity}`).join(', ') || 'N/A';
      
      return {
        'Order ID': o.order_number,
        'Order Date': new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        'Customer Name': shippingAddress?.fullName || 'N/A',
        'Customer Email': shippingAddress?.email || 'N/A',
        'Customer Phone': shippingAddress?.phone || 'N/A',
        'Products Purchased': items,
        'Quantity': o.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0,
        'Order Value': Number(o.total_amount || 0),
        'Payment Status': o.payment_status || 'pending',
        'Payment Method': o.payment_type === 'cod' ? 'Cash on Delivery' : 'Prepaid',
        'Order Status': o.status || 'pending',
        'Shipping Region': o.shipping_region || 'N/A',
        'Pincode': o.pincode || 'N/A',
      };
    }) || [];
    
    const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
    // Set column widths for better readability
    ordersSheet['!cols'] = [
      { wch: 15 }, // Order ID
      { wch: 12 }, // Order Date
      { wch: 20 }, // Customer Name
      { wch: 25 }, // Customer Email
      { wch: 15 }, // Customer Phone
      { wch: 40 }, // Products Purchased
      { wch: 10 }, // Quantity
      { wch: 12 }, // Order Value
      { wch: 15 }, // Payment Status
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Order Status
      { wch: 15 }, // Shipping Region
      { wch: 10 }, // Pincode
    ];
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Orders');

    // Product-wise Sales Sheet
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
        'Revenue': `₹${data.revenue.toFixed(2)}`,
      }));

    const productSheet = XLSX.utils.json_to_sheet(productData);
    productSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Sales');

    // Daily Sales Sheet
    const dailySales: Record<string, { orders: number; revenue: number }> = {};
    orders?.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!dailySales[date]) {
        dailySales[date] = { orders: 0, revenue: 0 };
      }
      dailySales[date].orders += 1;
      dailySales[date].revenue += Number(order.total_amount || 0);
    });

    const dailyData = Object.entries(dailySales)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, data]) => ({
        'Date': date,
        'Orders': data.orders,
        'Revenue': `₹${data.revenue.toFixed(2)}`,
      }));

    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    dailySheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Sales');

    // Generate Excel file as array buffer
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));

    return new Response(
      JSON.stringify({ 
        base64,
        filename: `Sharma_Coffee_Sales_Report_${getMonthName(month)}_${year}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Unknown';
}
