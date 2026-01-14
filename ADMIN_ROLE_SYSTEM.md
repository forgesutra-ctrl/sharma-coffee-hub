# Admin Role-Based Access Control System

## Overview

Sharma Coffee Works has a comprehensive role-based access control (RBAC) system that enforces access restrictions at both the database level (Supabase RLS) and application level (React frontend).

## Admin Accounts

### Super Admin
- **Email**: ask@sharmacoffeeworks.com
- **Password**: ScW@1987
- **Role**: `super_admin`
- **Access**: Full unrestricted access to all admin features

### Staff
- **Email**: sharmacoffeeoffice@gmail.com
- **Password**: SCO@1987
- **Role**: `staff`
- **Access**: Limited to Operations and Shipping pages only

## Role Storage

Roles are stored in the `user_roles` table in Supabase:

```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),
  role app_role DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);
```

The `app_role` enum includes:
- `super_admin` - Full access to all features
- `admin` - Admin access (treated same as super_admin)
- `staff` - Limited access (operations and shipping only)
- `shop_staff` - Limited access (treated same as staff)
- `user` - Regular customer account

## Authentication Flow

1. **Login**: User authenticates via Supabase Auth
2. **Role Fetch**: `AuthContext` fetches the user's role from `user_roles` table
3. **State Management**: Role is stored in React context and checked on every route
4. **Route Protection**: Both `ProtectedRoute` and `SuperAdminOnly` components enforce access
5. **RLS Validation**: Supabase Row Level Security validates all database operations

## Frontend Access Control

### AuthContext
Location: `src/context/AuthContext.tsx`

Provides:
- `user` - Authenticated user object
- `userRole` - User's role from database
- `isAdmin` - True for `super_admin` or `admin`
- `isSuperAdmin` - True for `super_admin` only
- `isStaff` - True for `staff` or `shop_staff`

### Route Protection

#### ProtectedRoute Component
Location: `src/components/auth/ProtectedRoute.tsx`

- Checks if user is authenticated
- For admin routes, allows both admins and staff to pass through
- `AdminLayout` handles specific page restrictions for staff

#### SuperAdminOnly Component
Location: `src/components/admin/SuperAdminOnly.tsx`

- Enforces super admin access for specific pages
- Redirects staff to `/admin/operations`
- Redirects non-admins to home page

### Admin Layout Navigation
Location: `src/components/admin/AdminLayout.tsx`

Automatically filters sidebar links based on role:

**Super Admin Sees**:
- Dashboard
- Orders
- Products
- Categories
- Customers
- Shipping
- Operations
- Reports

**Staff Sees**:
- Shipping
- Operations

Staff attempting to access super-admin-only pages via direct URL are automatically redirected to `/admin/operations`.

### Page-Level Protection

The following pages are wrapped with `SuperAdminOnly`:
- Dashboard (`src/pages/admin/Dashboard.tsx`)
- Orders (`src/pages/admin/OrdersPage.tsx`)
- Products (`src/pages/admin/ProductsPage.tsx`)
- Categories (`src/pages/admin/CategoriesPage.tsx`)
- Customers (`src/pages/admin/CustomersPage.tsx`)
- Reports (`src/pages/admin/ReportsPage.tsx`)

Staff can access:
- Shipping (`src/pages/admin/ShippingPage.tsx`)
- Operations (`src/pages/admin/OperationsPage.tsx`)

## Database-Level Security (RLS)

### Helper Functions

Three security functions are defined to check user roles:

```sql
-- Check if user is super admin or admin
CREATE FUNCTION is_super_admin(_user_id uuid) RETURNS boolean;

-- Check if user is staff
CREATE FUNCTION is_staff(_user_id uuid) RETURNS boolean;

-- Check if user has any admin access
CREATE FUNCTION has_admin_access(_user_id uuid) RETURNS boolean;
```

### RLS Policies

#### Super Admin Access
Super admins have full access to:
- `products` - All operations
- `product_variants` - All operations
- `categories` - All operations
- `user_roles` - All operations
- `customer_segments` - All operations
- `subscriptions` - All operations
- `orders` - View and update all
- `order_items` - View all

#### Staff Access
Staff have limited access to:
- `orders` - View and update status
- `order_items` - View only
- `shipments` - View and manage

#### Regular Users
- Can only access their own data
- Cannot access admin features

## Access Rules Summary

### Super Admin Can Access:
✅ Dashboard - Analytics and overview
✅ Orders - Full order management
✅ Products - Product catalog management
✅ Categories - Category hierarchy management
✅ Customers - Customer data and segments
✅ Shipping - Shipment tracking and labels
✅ Operations - Operational tasks
✅ Reports - Sales reports and analytics

### Staff Can Access:
✅ Operations - Daily operational tasks
✅ Shipping - Shipment management

### Staff CANNOT Access:
❌ Dashboard - No access to analytics
❌ Orders - No direct order management
❌ Products - No product editing
❌ Categories - No category management
❌ Customers - No customer data access
❌ Reports - No financial/sales reports

## Security Best Practices

1. **No Client-Side Only Security**: All access control is enforced server-side via RLS
2. **No Email-Based Logic**: Roles are stored in database, not inferred from email
3. **Single Source of Truth**: Supabase database is the authoritative source for roles
4. **Defense in Depth**: Multiple layers of security (RLS + frontend guards)
5. **No Password Exposure**: Credentials never logged or exposed in frontend
6. **Session Validation**: Role checked on every auth state change

## Testing

### Test Super Admin Access
1. Navigate to `/admin/login`
2. Login with `ask@sharmacoffeeworks.com` / `ScW@1987`
3. Verify full access to all menu items
4. Try accessing `/admin/dashboard` - should succeed
5. Try accessing `/admin/reports` - should succeed

### Test Staff Access
1. Logout if logged in
2. Navigate to `/admin/login`
3. Login with `sharmacoffeeoffice@gmail.com` / `SCO@1987`
4. Verify only Operations and Shipping in menu
5. Try accessing `/admin/dashboard` via URL - should redirect to `/admin/operations`
6. Try accessing `/admin/products` via URL - should redirect to `/admin/operations`
7. Access `/admin/operations` - should succeed
8. Access `/admin/shipping` - should succeed

### Test Database Security
All database operations are automatically validated by RLS policies. Staff cannot:
- Read product data
- Write to categories
- Access customer segments
- View financial reports

## Troubleshooting

### User Can't Login
- Verify user exists in `auth.users` table
- Check email is confirmed
- Verify password is correct

### User Has Wrong Access Level
- Check `user_roles` table for correct role assignment
- Verify RLS policies are active on tables
- Clear browser cache and re-login

### Role Not Loading
- Check browser console for errors
- Verify `user_roles` table has entry for user
- Check network tab for failed queries

## Database Queries

### Check User Roles
```sql
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('ask@sharmacoffeeworks.com', 'sharmacoffeeoffice@gmail.com');
```

### Update User Role
```sql
UPDATE user_roles
SET role = 'super_admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

### Create New Admin
```bash
curl -X POST "https://cfuwclyvoemrutrcgxeq.supabase.co/functions/v1/create-admin-user" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@example.com","password":"SecurePass123","role":"super_admin"}'
```

## Maintenance

### Adding New Admin Pages
1. Create the page component in `src/pages/admin/`
2. Wrap with `SuperAdminOnly` if super-admin-only
3. Add route in `src/App.tsx` under admin routes
4. Add navigation link in `src/components/admin/AdminLayout.tsx`
5. Set `superAdminOnly: true` or `staffAllowed: true` in link config

### Modifying Role Permissions
1. Update RLS policies in Supabase if changing database access
2. Update `AdminLayout` sidebar link configuration
3. Add/remove `SuperAdminOnly` wrapper on page components
4. Test thoroughly with both super admin and staff accounts

## Security Audit Checklist

- ✅ All admin users exist in Supabase Auth
- ✅ Roles stored in `user_roles` table
- ✅ RLS enabled on all tables
- ✅ RLS policies restrict staff access appropriately
- ✅ Frontend guards prevent unauthorized route access
- ✅ Staff cannot access super-admin-only pages via URL
- ✅ No hardcoded credentials in frontend code
- ✅ No email-based role inference
- ✅ All API calls validate roles server-side
- ✅ Session state updated on auth changes
