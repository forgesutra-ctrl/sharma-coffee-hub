import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  product_id: string;
  weight: number;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  cod_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductVariantsManagerProps {
  productId: string;
}

export default function ProductVariantsManager({ productId }: ProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    weight: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '0',
    cod_enabled: true,
  });

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('weight', { ascending: true });

      if (error) throw error;
      setVariants((data as ProductVariant[]) || []);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Failed to load variants');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingVariant(null);
    setFormData({
      weight: '',
      price: '',
      compare_at_price: '',
      stock_quantity: '0',
      cod_enabled: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      weight: variant.weight.toString(),
      price: variant.price.toString(),
      compare_at_price: variant.compare_at_price?.toString() || '',
      stock_quantity: variant.stock_quantity.toString(),
      cod_enabled: variant.cod_enabled ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const weight = parseInt(formData.weight);
    const price = parseFloat(formData.price);

    if (!weight || weight <= 0) {
      toast.error('Valid weight is required');
      return;
    }
    if (!price || price <= 0) {
      toast.error('Valid price is required');
      return;
    }

    try {
      const variantData = {
        product_id: productId,
        weight,
        price,
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        cod_enabled: formData.cod_enabled,
      };

      if (editingVariant) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', editingVariant.id);

        if (error) throw error;
        toast.success('Variant updated');
      } else {
        const { error } = await supabase.from('product_variants').insert(variantData);
        if (error) throw error;
        toast.success('Variant added');
      }

      setIsDialogOpen(false);
      fetchVariants();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save variant';
      toast.error(message);
    }
  };

  const deleteVariant = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return;

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      setVariants(variants.filter(v => v.id !== variantId));
      toast.success('Variant deleted');
    } catch (error) {
      toast.error('Failed to delete variant');
    }
  };

  const toggleCod = async (variant: ProductVariant) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ cod_enabled: !variant.cod_enabled })
        .eq('id', variant.id);

      if (error) throw error;
      setVariants(variants.map(v => 
        v.id === variant.id ? { ...v, cod_enabled: !v.cod_enabled } : v
      ));
      toast.success(`COD ${!variant.cod_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update COD status');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants</CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-1" />
            Add Variant
          </Button>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No variants yet. Add at least one variant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Weight (g)</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Compare Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variant.weight}g</TableCell>
                    <TableCell>₹{variant.price}</TableCell>
                    <TableCell>
                      {variant.compare_at_price ? `₹${variant.compare_at_price}` : '—'}
                    </TableCell>
                    <TableCell>{variant.stock_quantity}</TableCell>
                    <TableCell>
                      <Switch
                        checked={variant.cod_enabled ?? true}
                        onCheckedChange={() => toggleCod(variant)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(variant)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteVariant(variant.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (grams) *</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="299"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">Compare-at Price (₹)</Label>
                <Input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  value={formData.compare_at_price}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                  placeholder="349"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <Label htmlFor="cod_enabled" className="font-medium">COD Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Allow Cash on Delivery for this variant
                </p>
              </div>
              <Switch
                id="cod_enabled"
                checked={formData.cod_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cod_enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingVariant ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
