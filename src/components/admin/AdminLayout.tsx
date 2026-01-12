import { Link, useLocation, Outlet } from 'react-router-dom';
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
  FolderTree
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck },
  { name: 'Operations', href: '/admin/operations', icon: Wrench },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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
          <h1 className="font-display text-lg font-bold">Admin</h1>
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
