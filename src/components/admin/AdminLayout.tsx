import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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
  FileText,
  Tag,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

// All sidebar links with access control
// superAdminOnly: Only super_admin and admin can access
// staffAllowed: Staff can access these pages
const allSidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, superAdminOnly: true, staffAllowed: false },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, superAdminOnly: true, staffAllowed: true },
  { name: 'Products', href: '/admin/products', icon: Package, superAdminOnly: true, staffAllowed: false },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree, superAdminOnly: true, staffAllowed: false },
  { name: 'Customers', href: '/admin/customers', icon: Users, superAdminOnly: true, staffAllowed: true },
  { name: 'Promotions', href: '/admin/promotions', icon: Tag, superAdminOnly: true, staffAllowed: false },
  { name: 'Blogs', href: '/admin/blogs', icon: BookOpen, superAdminOnly: true, staffAllowed: false },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck, superAdminOnly: false, staffAllowed: true },
  { name: 'Operations', href: '/admin/operations', icon: Wrench, superAdminOnly: false, staffAllowed: true },
  { name: 'Reports', href: '/admin/reports', icon: FileText, superAdminOnly: true, staffAllowed: false },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, superAdminOnly: true, staffAllowed: false },
];

export default function AdminLayout() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isSuperAdmin, isStaff, isLoading } = useAuth();

  // Ensure the admin shell is never aria-hidden, to avoid focus deadlocks
  // and "Blocked aria-hidden" warnings from Chrome when dialogs open.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ensureNotAriaHidden = () => {
      if (el.getAttribute('aria-hidden') === 'true') {
        el.removeAttribute('aria-hidden');
      }
      if (el.getAttribute('data-aria-hidden') === 'true') {
        el.removeAttribute('data-aria-hidden');
      }
    };

    // Run once on mount.
    ensureNotAriaHidden();

    // Observe attribute changes on this container so that Radix or other
    // libraries can't permanently hide the admin layout.
    const observer = new MutationObserver(() => {
      ensureNotAriaHidden();
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-aria-hidden'],
    });

    return () => observer.disconnect();
  }, []);

  // Filter sidebar links based on role
  const sidebarLinks = allSidebarLinks.filter(link => {
    if (isSuperAdmin) return true; // Super admin sees all
    if (isStaff) return link.staffAllowed; // Staff sees only allowed items
    return false;
  });

  // Get default route based on role
  const getDefaultRoute = () => {
    if (isSuperAdmin) return '/admin';
    if (isStaff) return '/admin/operations';
    return '/';
  };

  // Check if current route is accessible
  const isRouteAccessible = (path: string) => {
    if (isSuperAdmin) return true;
    if (isStaff) {
      const allowedPaths = ['/admin/operations', '/admin/shipping', '/admin/orders', '/admin/customers'];
      return allowedPaths.some(p => path.startsWith(p));
    }
    return false;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Show loading while checking roles
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect staff from super-admin-only pages
  if (isStaff && !isSuperAdmin && !isRouteAccessible(location.pathname)) {
    return <Navigate to="/admin/operations" replace />;
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r hidden md:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to Store</span>
          </Link>
          <h1 className="font-display text-xl font-bold mt-3">Admin Panel</h1>
          {isStaff && !isSuperAdmin && (
            <p className="text-xs text-muted-foreground mt-1">Staff View</p>
          )}
          {isSuperAdmin && (
            <p className="text-xs text-muted-foreground mt-1">Super Admin</p>
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
            {isStaff && !isSuperAdmin && (
              <p className="text-xs text-muted-foreground">Staff</p>
            )}
            {isSuperAdmin && (
              <p className="text-xs text-muted-foreground">Super Admin</p>
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