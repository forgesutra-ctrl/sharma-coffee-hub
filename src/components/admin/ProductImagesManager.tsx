import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

interface ProductImagesManagerProps {
  productId: string;
}

export default function ProductImagesManager({ productId }: ProductImagesManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 5MB)`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`;

        console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        console.log('Public URL:', urlData.publicUrl);

        // Insert into product_images table
        const isPrimary = images.length === 0 && i === 0;
        const { error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            is_primary: isPrimary,
            sort_order: images.length + i,
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        // Update product.image_url if this is the primary image
        if (isPrimary) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: urlData.publicUrl })
            .eq('id', productId);

          if (updateError) {
            console.error('Product update error:', updateError);
          }
        }
      }

      toast.success(`${files.length} image(s) uploaded successfully`);
      fetchImages();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const setPrimaryImage = async (imageId: string, imageUrl: string) => {
    try {
      // Clear existing primary
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set new primary
      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      // Update product.image_url
      await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);

      toast.success('Primary image updated');
      fetchImages();
    } catch (error) {
      toast.error('Failed to update primary image');
    }
  };

  const moveImage = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    try {
      const swapImage = images[newIndex];
      
      await supabase
        .from('product_images')
        .update({ sort_order: newIndex })
        .eq('id', imageId);

      await supabase
        .from('product_images')
        .update({ sort_order: currentIndex })
        .eq('id', swapImage.id);

      fetchImages();
    } catch (error) {
      toast.error('Failed to reorder images');
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Extract file path from URL and delete from storage
      const urlParts = imageUrl.split('/product-images/');
      if (urlParts.length > 1) {
        await supabase.storage
          .from('product-images')
          .remove([urlParts[1]]);
      }

      // If this was primary, set next image as primary
      const remainingImages = images.filter(img => img.id !== imageId);
      if (remainingImages.length > 0) {
        const wasPrimary = images.find(img => img.id === imageId)?.is_primary;
        if (wasPrimary) {
          await setPrimaryImage(remainingImages[0].id, remainingImages[0].image_url);
        }
      } else {
        // No images left, clear product.image_url
        await supabase
          .from('products')
          .update({ image_url: null })
          .eq('id', productId);
      }

      toast.success('Image deleted');
      fetchImages();
    } catch (error) {
      toast.error('Failed to delete image');
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
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload Images'}
        </Button>

        {images.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm py-4">
            No images yet
          </p>
        ) : (
          <div className="space-y-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                <img
                  src={image.image_url}
                  alt=""
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  {image.is_primary && (
                    <span className="text-xs text-primary font-medium">Primary</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {!image.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrimaryImage(image.id, image.image_url)}
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveImage(image.id, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveImage(image.id, 'down')}
                    disabled={index === images.length - 1}
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteImage(image.id, image.image_url)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
