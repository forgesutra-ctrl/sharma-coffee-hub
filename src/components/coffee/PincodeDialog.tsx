import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PincodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPincodeValidated: (pincode: string, region: string, multiplier: number, codAvailable: boolean) => void;
  initialPincode?: string;
}

const PincodeDialog = ({
  isOpen,
  onClose,
  onPincodeValidated,
  initialPincode = ''
}: PincodeDialogProps) => {
  const [pincode, setPincode] = useState(initialPincode);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ region: string; codAvailable: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPincode(initialPincode || '');
      setError('');
      setSuccess(null);
    }
  }, [isOpen, initialPincode]);

  const handleCheck = async () => {
    if (pincode.length !== 6) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsChecking(true);
    setError('');
    setSuccess(null);

    try {
      const { data, error: dbError } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('pincode', pincode)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        setSuccess({ region: data.region, codAvailable: data.cod_available });
      } else {
        setError('Sorry, we do not deliver to this pincode yet. Please try another pincode.');
      }
    } catch (err) {
      console.error('Pincode check error:', err);
      setError('Failed to check pincode. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirm = () => {
    if (success) {
      // Get the shipping rate from the last check
      supabase
        .from('shipping_zones')
        .select('rate_per_kg')
        .eq('pincode', pincode)
        .single()
        .then(({ data }) => {
          onPincodeValidated(
            pincode,
            success.region,
            data?.rate_per_kg || 0,
            success.codAvailable
          );
        });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          // Focus input after a small delay
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Check Delivery Availability
          </DialogTitle>
          <DialogDescription>
            Enter your pincode to check if we deliver to your area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pincode-check">Enter your pincode</Label>
            <div className="flex gap-2 mt-2">
              <Input
                ref={inputRef}
                id="pincode-check"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPincode(value);
                  setError('');
                  setSuccess(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pincode.length === 6 && !isChecking) {
                    handleCheck();
                  }
                }}
                placeholder="Enter 6-digit pincode"
                className="flex-1 text-lg tracking-wider"
              />
              <Button
                onClick={handleCheck}
                disabled={isChecking || pincode.length !== 6}
                className="px-6"
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Great news! We deliver to {pincode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Region: {success.region}
                    {success.codAvailable && ' • COD Available'}
                  </p>
                </div>
              </div>

              <Button onClick={handleConfirm} className="w-full">
                Confirm & Continue
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PincodeDialog;
