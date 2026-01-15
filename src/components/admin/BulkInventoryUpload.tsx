import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVRow {
  product_id: string;
  product_name: string;
  sku: string;
  weight: number;
  quantity: number;
  price: number;
  category: string;
  status: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function BulkInventoryUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const downloadSampleCSV = () => {
    const sampleData = [
      ['product_id', 'product_name', 'sku', 'weight', 'quantity', 'price', 'category', 'status'],
      ['', 'Premium Blend Coffee', 'PBC-250', '250', '100', '299', 'Ground Coffee', 'active'],
      ['', 'Coorg Classic Beans', 'CCB-500', '500', '50', '599', 'Whole Beans', 'active'],
      ['existing-product-id', 'Gold Blend', 'GB-1000', '1000', '25', '1199', 'Ground Coffee', 'active'],
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      toast.error('CSV file is empty or invalid');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['product_id', 'product_name', 'sku', 'weight', 'quantity', 'price', 'category', 'status'];

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }

    const data: CSVRow[] = [];
    const validationErrors: ValidationError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      if (!row.product_name) {
        validationErrors.push({ row: i + 1, field: 'product_name', message: 'Product name is required' });
      }

      if (!row.sku) {
        validationErrors.push({ row: i + 1, field: 'sku', message: 'SKU is required' });
      }

      const weight = parseInt(row.weight);
      if (isNaN(weight) || weight <= 0) {
        validationErrors.push({ row: i + 1, field: 'weight', message: 'Valid weight is required' });
      }

      const quantity = parseInt(row.quantity);
      if (isNaN(quantity) || quantity < 0) {
        validationErrors.push({ row: i + 1, field: 'quantity', message: 'Valid quantity is required' });
      }

      const price = parseFloat(row.price);
      if (isNaN(price) || price <= 0) {
        validationErrors.push({ row: i + 1, field: 'price', message: 'Valid price is required' });
      }

      data.push(row as CSVRow);
    }

    setPreviewData(data);
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      toast.success(`${data.length} rows validated successfully`);
    } else {
      toast.warning(`Found ${validationErrors.length} validation errors`);
    }
  };

  const processUpload = async () => {
    if (errors.length > 0) {
      toast.error('Please fix validation errors before processing');
      return;
    }

    setIsProcessing(true);
    let processed = 0;
    const failedRows: { row: number; reason: string }[] = [];

    try {
      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i];

        try {
          let productId = row.product_id;

          if (!productId) {
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('sku', row.sku)
              .maybeSingle();

            if (existingProduct) {
              productId = existingProduct.id;
            } else {
              const { data: category } = await supabase
                .from('categories')
                .select('id')
                .eq('name', row.category)
                .maybeSingle();

              const { data: newProduct, error: productError } = await supabase
                .from('products')
                .insert({
                  name: row.product_name,
                  sku: row.sku,
                  category_id: category?.id || null,
                  category: row.category,
                  slug: row.product_name.toLowerCase().replace(/\s+/g, '-'),
                  is_active: row.status === 'active',
                })
                .select()
                .single();

              if (productError) throw productError;
              productId = newProduct.id;
            }
          }

          const { data: existingVariant } = await supabase
            .from('product_variants')
            .select('id')
            .eq('product_id', productId)
            .eq('weight', parseInt(row.weight.toString()))
            .maybeSingle();

          if (existingVariant) {
            const { error: updateError } = await supabase
              .from('product_variants')
              .update({
                price: parseFloat(row.price.toString()),
                stock_quantity: parseInt(row.quantity.toString()),
              })
              .eq('id', existingVariant.id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('product_variants')
              .insert({
                product_id: productId,
                weight: parseInt(row.weight.toString()),
                price: parseFloat(row.price.toString()),
                stock_quantity: parseInt(row.quantity.toString()),
                sku: row.sku,
              });

            if (insertError) throw insertError;
          }

          processed++;
          setProcessedCount(processed);
        } catch (error: any) {
          console.error(`Error processing row ${i + 2}:`, error);
          failedRows.push({ row: i + 2, reason: error.message });
        }
      }

      setUploadComplete(true);

      if (failedRows.length === 0) {
        toast.success(`Successfully processed ${processed} rows`);
      } else {
        toast.warning(`Processed ${processed} rows with ${failedRows.length} failures`);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to process bulk upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setUploadComplete(false);
    setProcessedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Inventory Upload</CardTitle>
        <CardDescription>
          Upload a CSV file to update multiple products and variants at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={downloadSampleCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Download Sample CSV
          </Button>

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button variant="default" className="gap-2 w-full sm:w-auto" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Select CSV File
                </span>
              </Button>
            </label>
          </div>
        </div>

        {file && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Selected: {file.name}</span>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Found {errors.length} validation errors:</p>
              <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>
                    Row {error.row}, {error.field}: {error.message}
                  </li>
                ))}
                {errors.length > 10 && <li className="font-semibold">...and {errors.length - 10} more</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {uploadComplete && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Successfully processed {processedCount} of {previewData.length} rows
            </AlertDescription>
          </Alert>
        )}

        {previewData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Preview</h3>
                <p className="text-sm text-muted-foreground">
                  {previewData.length} rows • {errors.length} errors
                </p>
              </div>
              <Button
                onClick={processUpload}
                disabled={errors.length > 0 || isProcessing || uploadComplete}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing ({processedCount}/{previewData.length})
                  </>
                ) : uploadComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </>
                ) : (
                  'Process Upload'
                )}
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((row, idx) => {
                    const rowErrors = errors.filter(e => e.row === idx + 2);
                    return (
                      <TableRow key={idx} className={rowErrors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.product_name}</TableCell>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>{row.weight}g</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>₹{row.price}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {previewData.length > 10 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  Showing first 10 of {previewData.length} rows
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
