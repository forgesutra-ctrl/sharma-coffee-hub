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
  // Subscription fields
  is_subscription?: boolean;
  original_price?: number;
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  billing_cycle: string;
  discount_percentage: number;
  is_active: boolean;
  product_id?: string | null;
  variant_id?: string | null;
  amount?: number | null;
  razorpay_plan_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: 'active' | 'paused' | 'cancelled';
  next_billing_date: string;
  shipping_address: ShippingAddress;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionOrder {
  id: string;
  subscription_id: string;
  order_id: string | null;
  billing_date: string;
  status: string;
  created_at: string;
}

export interface UserSubscriptionWithDetails extends UserSubscription {
  plan: SubscriptionPlan;
  product: ProductV2;
  variant?: ProductVariant;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  discount_value: number;
  coupon_code: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applicable_products: string[] | null;
  applicable_categories: string[] | null;
  start_date: string;
  end_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionUsage {
  id: string;
  promotion_id: string;
  user_id: string | null;
  order_id: string | null;
  discount_applied: number;
  used_at: string;
}