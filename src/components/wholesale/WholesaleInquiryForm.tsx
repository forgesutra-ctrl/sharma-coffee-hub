import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, User, Mail, Phone, MapPin, Package, Send, Loader2 } from 'lucide-react';

const businessTypes = [
  { value: 'cafe', label: 'Café / Coffee Shop' },
  { value: 'restaurant', label: 'Restaurant / Hotel' },
  { value: 'retailer', label: 'Retail Store' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'caterer', label: 'Caterer / Event Services' },
  { value: 'corporate', label: 'Corporate Office' },
  { value: 'other', label: 'Other' },
];

const productOptions = [
  'Filter Coffee Blends',
  'Gold Blend',
  'Premium Blend',
  'Specialty Blend',
  'Royal Caffeine (Pure Coffee)',
  'Coffee Chocolate',
  'Instant Decoction',
];

const volumeOptions = [
  '5-10 kg/month',
  '10-25 kg/month',
  '25-50 kg/month',
  '50-100 kg/month',
  '100+ kg/month',
];

export default function WholesaleInquiryForm() {
  const [formData, setFormData] = useState({
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    businessType: '',
    productsInterested: [] as string[],
    estimatedVolume: '',
    deliveryLocation: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProductToggle = (product: string) => {
    setFormData(prev => ({
      ...prev,
      productsInterested: prev.productsInterested.includes(product)
        ? prev.productsInterested.filter(p => p !== product)
        : [...prev.productsInterested, product],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.productsInterested.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('wholesale_inquiries')
        .insert({
          business_name: formData.businessName,
          contact_person: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          business_type: formData.businessType,
          products_interested: formData.productsInterested,
          estimated_volume: formData.estimatedVolume,
          delivery_location: formData.deliveryLocation,
          message: formData.message || null,
        });

      if (error) throw error;

      toast.success('Inquiry submitted successfully! We\'ll contact you within 12 hours.');
      setFormData({
        businessName: '',
        contactPerson: '',
        email: '',
        phone: '',
        businessType: '',
        productsInterested: [],
        estimatedVolume: '',
        deliveryLocation: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Business Details */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Business Details
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Your business name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Contact Information
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person *</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="Your name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 8762 988 145"
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products & Volume */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Products & Requirements
        </h3>
        
        <div className="space-y-4">
          <Label>Products Interested *</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {productOptions.map((product) => (
              <label
                key={product}
                className="flex items-center gap-3 p-3 bg-muted/30 border border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Checkbox
                  checked={formData.productsInterested.includes(product)}
                  onCheckedChange={() => handleProductToggle(product)}
                />
                <span className="text-sm">{product}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimatedVolume">Estimated Monthly Volume</Label>
            <Select
              value={formData.estimatedVolume}
              onValueChange={(value) => setFormData({ ...formData, estimatedVolume: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {volumeOptions.map((volume) => (
                  <SelectItem key={volume} value={volume}>
                    {volume}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deliveryLocation">Delivery Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="City, State"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Additional Requirements (Optional)</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about any specific requirements, customization needs, or questions..."
          rows={4}
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Inquiry
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        We typically respond within 12 hours during business hours.
      </p>
    </form>
  );
}
