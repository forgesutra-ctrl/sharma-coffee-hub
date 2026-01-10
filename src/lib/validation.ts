import { z } from 'zod';

/**
 * Shipping address validation schema
 * Matches the server-side validation in the database trigger
 */
export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'Full name contains invalid characters'),
  
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, 'Phone must be a valid 10-digit Indian mobile number'),
  
  addressLine1: z
    .string()
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'Address contains invalid characters'),
  
  addressLine2: z
    .string()
    .trim()
    .max(200, 'Address line 2 must be less than 200 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'Address contains invalid characters')
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'City contains invalid characters'),
  
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must be less than 100 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'State contains invalid characters'),
  
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Pincode must be a valid 6-digit Indian pincode'),
  
  landmark: z
    .string()
    .trim()
    .max(200, 'Landmark must be less than 200 characters')
    .regex(/^[^<>"'\x00-\x1f]*$/, 'Landmark contains invalid characters')
    .optional()
    .or(z.literal('')),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

/**
 * Validate shipping address and return formatted errors
 */
export function validateShippingAddress(data: unknown): {
  success: boolean;
  data?: ShippingAddressInput;
  errors?: Record<string, string>;
} {
  const result = shippingAddressSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path && !errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}

/**
 * Order item validation schema
 */
export const orderItemSchema = z.object({
  product_name: z.string().min(1).max(200),
  grind_type: z.string().min(1).max(50),
  weight: z.number().positive().max(10000),
  quantity: z.number().int().positive().max(100),
  unit_price: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
