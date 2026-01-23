import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowLeft, Loader2, Coffee } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const redirectTo = (location.state as any)?.from || '/account';

  const handleSignUp = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Failed to create account');
      }

      // Check if user needs email confirmation (Supabase setting)
      // If email confirmation is disabled, user is automatically signed in
      if (data.session) {
        const userId = data.user.id;
        let finalRedirect = redirectTo;

        // Wait a moment for the trigger to create the profile and role
        // The handle_new_user trigger should create these, but there might be a small delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check user role for admin redirect (with retry if not found)
        if (userId) {
          let userRole = null;
          let retries = 3;
          
          while (retries > 0 && !userRole) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (roleData) {
              userRole = roleData;
              break;
            }
            
            // Wait a bit longer and retry
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          }

          if (userRole?.role && ['super_admin', 'admin', 'staff'].includes(userRole.role)) {
            finalRedirect = '/admin/dashboard';
          }
        }

        toast({
          title: 'Account Created',
          description: 'Your account has been created successfully',
        });

        navigate(finalRedirect, { replace: true });
      } else {
        // Email confirmation required - but still allow login attempt
        // Some Supabase configurations might not return a session even if email confirmation is disabled
        toast({
          title: 'Account Created',
          description: 'Your account has been created. You can now sign in.',
        });
        setMode('signin');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password',
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

      if (!data.session || !data.user) {
        throw new Error('Login failed. Please try again.');
      }

      const userId = data.user.id;
      let finalRedirect = redirectTo;

      // Check user role for admin redirect
      if (userId) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (userRole?.role && ['super_admin', 'admin', 'staff'].includes(userRole.role)) {
          finalRedirect = '/admin/dashboard';
        }
      }

      toast({
        title: 'Welcome Back',
        description: 'You have been successfully logged in',
      });

      navigate(finalRedirect, { replace: true });
    } catch (error: any) {
      let errorMessage = 'Failed to sign in. Please check your credentials and try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Sign In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Sharma Coffee Works</h1>
          <p className="text-muted-foreground text-sm mt-1">Est. 1987 • Coorg, Karnataka</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm">Back</span>
          </button>

          <h2 className="text-xl font-semibold text-center mb-2">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-muted-foreground text-center text-sm mb-6">
            {mode === 'signin'
              ? 'Sign in to your account to continue'
              : 'Enter your details to create a new account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-background"
                disabled={isLoading}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password (min. 6 characters)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-background"
                disabled={isLoading}
                required
                minLength={mode === 'signup' ? 6 : undefined}
              />
            </div>

            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 bg-background"
                  disabled={isLoading}
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {mode === 'signin' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-xs text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
