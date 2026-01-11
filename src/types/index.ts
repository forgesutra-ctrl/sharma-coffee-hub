export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductV2 {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  images: string[];
  status: 'active' | 'discontinued';
  has_chicory_variants: boolean;
  has_weight_variants: boolean;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[];
  subscription_eligible: boolean;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  weight: number;
  weight_unit: 'g' | 'ml' | 'kg' | 'l';
  chicory_percentage: number;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  status: 'active' | 'out_of_stock' | 'discontinued';
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithVariants {
  product_id: string;
  product_name: string;
  product_slug: string;
  description: string;
  base_price: number;
  images: string[];
  product_status: 'active' | 'discontinued';
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  featured: boolean;
  subscription_eligible: boolean;
  has_chicory_variants: boolean;
  has_weight_variants: boolean;
  variant_id: string;
  sku: string;
  variant_name: string;
  weight: number;
  weight_unit: string;
  chicory_percentage: number;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  variant_status: 'active' | 'out_of_stock' | 'discontinued';
  is_default: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  image_url: string;
  images: string[];
  roast_level: 'Light' | 'Medium' | 'Dark';
  has_chicory: boolean;
  origin: string;
  flavor_notes: string[];
  available_weights: number[];
  brewing_methods: string[];
  storage_tips: string;
  is_featured: boolean;
  in_stock: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  weight: number;
  quantity: number;
  sku?: string;
  variant_id?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: string;
  tracking_number: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  content: string;
  rating: number;
  location: string;
  is_featured: boolean;
  created_at: string;
}

export interface BrewingGuide {
  id: string;
  title: string;
  slug: string;
  description: string;
  equipment: string[];
  ingredients: {
    coffee: string;
    water: string;
  };
  steps: {
    step: number;
    instruction: string;
  }[];
  tips: string[];
  recommended_products: string[];
  image_url: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  brew_time: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WholesaleInquiry {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  business_type: string;
  estimated_volume: string;
  message: string;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  product_id: string;
  product_name: string;
  weight: number;
  quantity: number;
  frequency: '15_days' | 'monthly' | '2_months';
  next_delivery_date: string;
  delivery_address: ShippingAddress;
  status: 'active' | 'paused' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
  paused_at?: string;
  cancelled_at?: string;
}

export interface SubscriptionDelivery {
  id: string;
  subscription_id: string;
  order_id?: string;
  scheduled_date: string;
  delivered_date?: string;
  status: 'scheduled' | 'processing' | 'shipped' | 'delivered' | 'skipped';
  tracking_number: string;
  created_at: string;
  updated_at: string;
}
