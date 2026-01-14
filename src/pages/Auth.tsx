import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, Loader2, Coffee } from 'lucide-react';

type AuthStep = 'email' | 'otp';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<AuthStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const redirectTo = (location.state as any)?.from || '/account';

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first OTP input
  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.every(digit => digit !== '')) {
      handleVerifyOtp();
    }
  }, [otp]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send OTP');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setMaskedEmail(response.data.maskedEmail || email);
      setStep('otp');
      setResendCooldown(30);
      toast({
        title: 'OTP Sent',
        description: 'Check your email for the verification code',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    if (attempts >= 5) {
      toast({
        title: 'Too many attempts',
        description: 'Please request a new OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setAttempts(prev => prev + 1);

    try {
      const response = await supabase.functions.invoke('verify-otp', {
        body: { email, otp: otpString },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to verify OTP');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Use the token hash to verify the session
      if (response.data?.tokenHash) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: response.data.tokenHash,
          type: 'magiclink',
        });

        if (verifyError) {
          throw new Error(verifyError.message || 'Session verification failed');
        }

        if (!verifyData?.session) {
          throw new Error('No session created. Please try again.');
        }

        const userId = verifyData.user?.id;
        let finalRedirect = redirectTo;

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
          title: response.data?.isNewUser ? 'Account Created' : 'Welcome Back',
          description: 'You have been successfully logged in',
        });

        navigate(finalRedirect, { replace: true });
      } else {
        throw new Error('Invalid verification response');
      }
    } catch (error: any) {
      toast({
        title: 'Invalid OTP',
        description: error.message || 'Please check the code and try again',
        variant: 'destructive',
      });
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = [...otp];
    pastedData.split('').forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);
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
          <p className="text-muted-foreground text-sm mt-1">Est. 1985 • Coorg, Karnataka</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {step === 'email' ? (
            <>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="text-sm">Back</span>
              </button>
              <h2 className="text-xl font-semibold text-center mb-2">Welcome</h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Enter your email to sign in or create an account
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    className="pl-10 h-12 bg-background"
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handleSendOtp}
                  disabled={isLoading || !email}
                  className="w-full h-12 text-base font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('email');
                  setOtp(['', '', '', '', '', '']);
                  setAttempts(0);
                }}
                className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>

              <h2 className="text-xl font-semibold text-center mb-2">Verify Email</h2>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Enter the 6-digit code sent to<br />
                <span className="text-foreground font-medium">{maskedEmail}</span>
              </p>

              <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-background"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.some(d => !d)}
                className="w-full h-12 text-base font-medium mb-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Resend OTP in {resendCooldown}s
                  </p>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {attempts > 0 && (
                <p className="text-muted-foreground text-xs text-center mt-4">
                  Attempts: {attempts}/5
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-muted-foreground text-xs text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
