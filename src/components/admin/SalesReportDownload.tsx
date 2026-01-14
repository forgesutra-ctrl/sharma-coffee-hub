import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SalesReportDownload = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sales-report', {
        body: { month, year }
      });

      if (error) throw error;

      // The response is a base64 encoded Excel file
      if (data?.base64) {
        const binaryString = atob(data.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: data.contentType || 'text/csv'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `sales-report-${month}-${year}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Report downloaded successfully');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Report download error:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m, i) => (
            <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={handleDownload} disabled={loading} variant="outline">
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {loading ? 'Generating...' : 'Download Report'}
      </Button>
    </div>
  );
};