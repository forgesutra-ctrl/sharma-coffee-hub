import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, User, Mail, Phone, MapPin, Package, Send, Loader2 } from 'lucide-react';
import { FieldError, EMAIL_PATTERN, focusFirstError } from '@/components/forms/FieldError';

// Styled by the form-field vocabulary in home-v2.css; rendered inside /wholesale's
// .home-v2 page.

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

type InquiryField = 'businessName' | 'businessType' | 'contactPerson' | 'phone' | 'email' | 'productsInterested';

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
  const [errors, setErrors] = useState<Partial<Record<InquiryField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clearError = (field: InquiryField) => {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleProductToggle = (product: string) => {
    setFormData(prev => ({
      ...prev,
      productsInterested: prev.productsInterested.includes(product)
        ? prev.productsInterested.filter(p => p !== product)
        : [...prev.productsInterested, product],
    }));
    clearError('productsInterested');
  };

  const validate = () => {
    const found: Partial<Record<InquiryField, string>> = {};
    if (!formData.businessName.trim()) found.businessName = 'Please enter your business name.';
    if (!formData.businessType) found.businessType = 'Please choose a business type.';
    if (!formData.contactPerson.trim()) found.contactPerson = 'Please enter a contact name.';
    if (!formData.phone.trim()) found.phone = 'Please enter a phone number.';
    if (!formData.email.trim()) found.email = 'Please enter your email address.';
    else if (!EMAIL_PATTERN.test(formData.email.trim())) found.email = 'That email address looks incomplete. Check it has an @ and a domain, like name@example.com.';
    if (formData.productsInterested.length === 0) found.productsInterested = 'Please select at least one product.';
    return found;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // After aria-invalid renders, take the user to the first problem.
      requestAnimationFrame(() => focusFirstError(formRef.current));
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

  const invalid = (field: InquiryField) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-10">
      {/* Business Details */}
      <div className="space-y-6">
        <h3 className="eyebrow flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" aria-hidden />
          Business Details
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-field">
            <Label htmlFor="businessName" className="form-label">Business Name *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => { setFormData({ ...formData, businessName: e.target.value }); clearError('businessName'); }}
              placeholder="Your business name"
              className="form-input"
              required
              {...invalid('businessName')}
            />
            <FieldError id="businessName-error" message={errors.businessName} />
          </div>

          <div className="form-field">
            <Label htmlFor="businessType" className="form-label">Business Type *</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => { setFormData({ ...formData, businessType: value }); clearError('businessType'); }}
              required
            >
              <SelectTrigger id="businessType" className="form-input" {...invalid('businessType')}>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="businessType-error" message={errors.businessType} />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-6">
        <h3 className="eyebrow flex items-center gap-2">
          <User className="w-4 h-4 text-primary" aria-hidden />
          Contact Information
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-field">
            <Label htmlFor="contactPerson" className="form-label">Contact Person *</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => { setFormData({ ...formData, contactPerson: e.target.value }); clearError('contactPerson'); }}
              placeholder="Your name"
              autoComplete="name"
              className="form-input"
              required
              {...invalid('contactPerson')}
            />
            <FieldError id="contactPerson-error" message={errors.contactPerson} />
          </div>

          <div className="form-field">
            <Label htmlFor="phone" className="form-label">Phone Number *</Label>
            <div className="form-input-wrap">
              <Phone aria-hidden />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); clearError('phone'); }}
                placeholder="+91 8762 988 145"
                autoComplete="tel"
                className="form-input"
                required
                {...invalid('phone')}
              />
            </div>
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          <div className="form-field sm:col-span-2">
            <Label htmlFor="email" className="form-label">Email Address *</Label>
            <div className="form-input-wrap">
              <Mail aria-hidden />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearError('email'); }}
                placeholder="your@email.com"
                autoComplete="email"
                className="form-input"
                required
                {...invalid('email')}
              />
            </div>
            <FieldError id="email-error" message={errors.email} />
          </div>
        </div>
      </div>

      {/* Products & Volume */}
      <div className="space-y-6">
        <h3 className="eyebrow flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" aria-hidden />
          Products & Requirements
        </h3>

        <fieldset className="form-field" aria-describedby={errors.productsInterested ? 'productsInterested-error' : undefined}>
          <legend className="form-label mb-2">Products Interested *</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {productOptions.map((product, i) => (
              <label key={product} className="form-check">
                <Checkbox
                  checked={formData.productsInterested.includes(product)}
                  onCheckedChange={() => handleProductToggle(product)}
                  {...(i === 0 ? invalid('productsInterested') : {})}
                />
                <span>{product}</span>
              </label>
            ))}
          </div>
          <FieldError id="productsInterested-error" message={errors.productsInterested} />
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-field">
            <Label htmlFor="estimatedVolume" className="form-label">Estimated Monthly Volume</Label>
            <Select
              value={formData.estimatedVolume}
              onValueChange={(value) => setFormData({ ...formData, estimatedVolume: value })}
            >
              <SelectTrigger id="estimatedVolume" className="form-input">
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {volumeOptions.map((volume) => (
                  <SelectItem key={volume} value={volume}>
                    {volume}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-field">
            <Label htmlFor="deliveryLocation" className="form-label">Delivery Location</Label>
            <div className="form-input-wrap">
              <MapPin aria-hidden />
              <Input
                id="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="City, State"
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Message */}
      <div className="form-field">
        <Label htmlFor="message" className="form-label">Additional Requirements (Optional)</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about any specific requirements, customization needs, or questions..."
          rows={4}
          className="form-input"
        />
      </div>

      {/* Submit Button */}
      <div className="space-y-3">
        <button type="submit" className="form-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Submitting...
            </>
          ) : (
            <>
              <Send aria-hidden />
              Submit Inquiry
            </>
          )}
        </button>

        <p className="form-help">
          We typically respond within 12 hours during business hours.
        </p>
      </div>
    </form>
  );
}
