import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface SuperAdminOnlyProps {
  children: React.ReactNode;
}

export default function SuperAdminOnly({ children }: SuperAdminOnlyProps) {
  const { isSuperAdmin, isStaff, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isStaff && !isSuperAdmin) {
    return <Navigate to="/admin/operations" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
