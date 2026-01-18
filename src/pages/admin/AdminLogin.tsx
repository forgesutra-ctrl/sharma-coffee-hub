import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Login failed');
      }

      // Check if user has admin, super_admin, or staff role
      console.log('[AdminLogin] Checking role for user ID:', data.user.id, 'Email:', data.user.email);
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, user_id, created_at')
        .eq('user_id', data.user.id)
        .maybeSingle();

      console.log('[AdminLogin] Role query result:', { roleData, roleError });

      if (roleError) {
        console.error('[AdminLogin] Error fetching user role:', roleError);
        // Try to get all roles for debugging
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id);
        console.error('[AdminLogin] All roles for user:', allRoles);
        await supabase.auth.signOut();
        throw new Error(`Failed to verify access permissions: ${roleError.message}. Please contact support.`);
      }

      // Allow super_admin, admin, and staff roles
      const allowedRoles = ['super_admin', 'admin', 'staff'];
      if (!roleData) {
        console.error('[AdminLogin] No role found for user:', data.user.id);
        // Check if user exists in user_roles at all
        const { data: checkRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', data.user.id);
        console.error('[AdminLogin] User roles check:', checkRoles);
        await supabase.auth.signOut();
        throw new Error('No admin role assigned. Please contact support to grant access.');
      }

      console.log('[AdminLogin] Current role:', roleData.role, 'Type:', typeof roleData.role);
      console.log('[AdminLogin] Allowed roles:', allowedRoles);
      console.log('[AdminLogin] Role in allowed list?', allowedRoles.includes(roleData.role));

      if (!allowedRoles.includes(roleData.role)) {
        console.error('[AdminLogin] Invalid role:', roleData.role, 'for user:', data.user.id);
        console.error('[AdminLogin] Full role data:', roleData);
        await supabase.auth.signOut();
        throw new Error(`Access denied. Your role (${roleData.role}) does not have admin privileges. Current role must be one of: ${allowedRoles.join(', ')}`);
      }

      console.log('[AdminLogin] ✅ User authenticated with role:', roleData.role);

      toast({
        title: 'Welcome back',
        description: 'Logged in successfully',
      });

      navigate('/admin', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Sharma Coffee Works</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-center mb-6">Sign In</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-background"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-background"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>
        </form>

        <p className="text-muted-foreground text-xs text-center mt-6">
          This portal is for authorized administrators only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
