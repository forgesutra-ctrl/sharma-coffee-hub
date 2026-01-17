/*
  # Add Missing Foreign Key Indexes for Performance Optimization

  ## Overview
  This migration adds missing indexes on foreign key columns to improve query performance.
  Foreign keys without indexes can cause table scans and slow down JOIN operations significantly.

  ## New Indexes Added

  ### Order Items Table
  - `idx_order_items_product_id` - Index on product_id foreign key
  - `idx_order_items_variant_id` - Index on variant_id foreign key

  ### Orders Table
  - `idx_orders_promotion_id` - Index on promotion_id foreign key

  ### Promotion Usage Table
  - `idx_promotion_usage_order_id` - Index on order_id foreign key
  - `idx_promotion_usage_promotion_id` - Index on promotion_id foreign key
  - `idx_promotion_usage_user_id` - Index on user_id foreign key

  ### Stock Change Logs Table
  - `idx_stock_change_logs_product_id` - Index on product_id foreign key

  ### Subscription Orders Table
  - `idx_subscription_orders_order_id` - Index on order_id foreign key

  ### Subscription Plans Table
  - `idx_subscription_plans_variant_id` - Index on variant_id foreign key

  ### Subscriptions Table
  - `idx_subscriptions_product_id` - Index on product_id foreign key
  - `idx_subscriptions_variant_id` - Index on variant_id foreign key

  ### User Subscriptions Table
  - `idx_user_subscriptions_plan_id` - Index on plan_id foreign key
  - `idx_user_subscriptions_product_id` - Index on product_id foreign key
  - `idx_user_subscriptions_user_id` - Index on user_id foreign key
  - `idx_user_subscriptions_variant_id` - Index on variant_id foreign key

  ## Performance Impact
  - Significantly improves JOIN query performance
  - Reduces table scan operations
  - Essential for scaling with larger datasets
*/

-- Order Items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_promotion_id ON orders(promotion_id);

-- Promotion Usage indexes
CREATE INDEX IF NOT EXISTS idx_promotion_usage_order_id ON promotion_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_user_id ON promotion_usage(user_id);

-- Stock Change Logs indexes
CREATE INDEX IF NOT EXISTS idx_stock_change_logs_product_id ON stock_change_logs(product_id);

-- Subscription Orders indexes
CREATE INDEX IF NOT EXISTS idx_subscription_orders_order_id ON subscription_orders(order_id);

-- Subscription Plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_variant_id ON subscription_plans(variant_id);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_variant_id ON subscriptions(variant_id);

-- User Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_product_id ON user_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_variant_id ON user_subscriptions(variant_id);
