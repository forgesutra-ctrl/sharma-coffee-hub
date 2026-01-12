import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProductVariantsManager from './ProductVariantsManager';
import ProductImagesManager from './ProductImagesManager';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
}

interface ProductEditorProps {
  productId?: string;
  onClose: () => void;
}

export default function ProductEditor({ productId, onClose }: ProductEditorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | undefined>(productId);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: '',
    flavor_notes: '',
    origin: '',
    roast_level: '',
    intensity: 3,
    is_active: true,
    is_featured: false,
  });

  useEffect(() => {
    fetchCategories();
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setCategories(data || []);
  };

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          category_id: data.category_id || '',
          flavor_notes: data.flavor_notes?.join(', ') || '',
          origin: data.origin || '',
          roast_level: data.roast_level || '',
          intensity: data.intensity || 3,
          is_active: data.is_active ?? true,
          is_featured: data.is_featured ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    // Check slug uniqueness
    const slug = formData.slug || generateSlug(formData.name);
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .neq('id', savedProductId || '')
      .single();

    if (existingProduct) {
      toast.error('A product with this slug already exists');
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name: formData.name,
        slug,
        description: formData.description || null,
        category_id: formData.category_id || null,
        flavor_notes: formData.flavor_notes ? formData.flavor_notes.split(',').map(n => n.trim()).filter(Boolean) : null,
        origin: formData.origin || null,
        roast_level: formData.roast_level || null,
        intensity: formData.intensity,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
      };

      if (savedProductId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', savedProductId);

        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        setSavedProductId(data.id);
        toast.success('Product created - you can now add variants and images');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const masterCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === formData.category_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-display text-2xl font-bold">
          {productId ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Premium Blend"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="premium-blend"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A rich, full-bodied blend..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Master Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {subCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="flavor_notes">Flavor Notes (comma-separated)</Label>
                <Input
                  id="flavor_notes"
                  value={formData.flavor_notes}
                  onChange={(e) => setFormData({ ...formData, flavor_notes: e.target.value })}
                  placeholder="Chocolate, Nutty, Caramel"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <Input
                    id="origin"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Coorg, Karnataka"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roast_level">Roast Level</Label>
                  <Input
                    id="roast_level"
                    value={formData.roast_level}
                    onChange={(e) => setFormData({ ...formData, roast_level: e.target.value })}
                    placeholder="Medium-Dark"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Intensity (1-5): {formData.intensity}</Label>
                <Slider
                  value={[formData.intensity]}
                  onValueChange={(value) => setFormData({ ...formData, intensity: value[0] })}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Variants Manager - Only show if product is saved */}
          {savedProductId && (
            <ProductVariantsManager productId={savedProductId} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : savedProductId ? 'Update Product' : 'Create Product'}
              </Button>
            </CardContent>
          </Card>

          {/* Images Manager - Only show if product is saved */}
          {savedProductId && (
            <ProductImagesManager productId={savedProductId} />
          )}
        </div>
      </div>
    </div>
  );
}
