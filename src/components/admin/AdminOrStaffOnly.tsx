import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface AdminOrStaffOnlyProps {
  children: React.ReactNode;
}

/**
 * Component that allows both admin and staff access
 * Redirects regular users to home page
 */
export default function AdminOrStaffOnly({ children }: AdminOrStaffOnlyProps) {
  const { isSuperAdmin, isStaff, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow both admin and staff
  if (!isSuperAdmin && !isStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
