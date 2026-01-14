import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { SalesReportDownload } from '@/components/admin/SalesReportDownload';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';

export default function ReportsPage() {
  return (
    <SuperAdminOnly>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Reports</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Monthly Sales Report
            </CardTitle>
            <CardDescription>
              Download a detailed Excel report with orders, products, and revenue breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesReportDownload />
          </CardContent>
        </Card>
      </div>
      </div>
    </SuperAdminOnly>
  );
}