import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Wrench,
  ChevronLeft,
  LogOut,
  FolderTree,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// All sidebar links with access control
const allSidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, adminOnly: true },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, adminOnly: true },
  { name: 'Products', href: '/admin/products', icon: Package, adminOnly: true },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree, adminOnly: true },
  { name: 'Customers', href: '/admin/customers', icon: Users, adminOnly: true },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck, adminOnly: false },
  { name: 'Operations', href: '/admin/operations', icon: Wrench, adminOnly: false },
  { name: 'Reports', href: '/admin/reports', icon: FileText, adminOnly: true },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // Fetch user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles?.includes('admin');
  const isShopStaff = userRoles?.includes('shop_staff' as any);
  const hasAccess = isAdmin || isShopStaff;

  // Filter sidebar links based on role
  const sidebarLinks = allSidebarLinks.filter(link => {
    if (isAdmin) return true; // Admin sees all
    if (isShopStaff) return !link.adminOnly; // Shop staff sees only non-admin items
    return false;
  });

  // Get default route for shop staff
  const getDefaultRoute = () => {
    if (isAdmin) return '/admin';
    if (isShopStaff) return '/admin/operations';
    return '/';
  };

  // Check if current route is accessible
  const isRouteAccessible = (path: string) => {
    if (isAdmin) return true;
    if (isShopStaff) {
      const allowedPaths = ['/admin/operations', '/admin/shipping'];
      return allowedPaths.some(p => path.startsWith(p));
    }
    return false;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Show loading while checking roles
  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect shop staff from admin-only pages
  if (isShopStaff && !isAdmin && !isRouteAccessible(location.pathname)) {
    return <Navigate to="/admin/operations" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r hidden md:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to Store</span>
          </Link>
          <h1 className="font-display text-xl font-bold mt-3">Admin Panel</h1>
          {isShopStaff && !isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">Shop Staff View</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-background border-b z-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold">Admin</h1>
            {isShopStaff && !isAdmin && (
              <p className="text-xs text-muted-foreground">Shop Staff</p>
            )}
          </div>
          <Link to="/" className="text-sm text-primary">
            ← Store
          </Link>
        </div>
        {/* Mobile Nav */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:pt-0 pt-28 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}