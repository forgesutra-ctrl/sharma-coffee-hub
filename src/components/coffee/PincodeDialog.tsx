import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, CheckCircle2, XCircle, Truck, X } from 'lucide-react';
import {
  validatePincode,
  getShippingRegion,
  getShippingRegionLabel,
  SHIPPING_CHARGES,
} from '@/lib/shipping';

interface PincodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPincodeValidated: (pincode: string, region: string, baseRate: number, codAvailable: boolean) => void;
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
  const [validationResult, setValidationResult] = useState<{
    region: string;
    regionLabel: string;
    baseRate: number;
    codAvailable: boolean;
  } | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPincode(initialPincode || '');
      setError('');
      setValidationResult(null);
      setIsChecking(false);
    }
  }, [isOpen, initialPincode]);

  // Don't render anything if not open
  if (!isOpen) return null;

  const handleCheck = () => {
    if (!validatePincode(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsChecking(true);
    setError('');
    setValidationResult(null);

    setTimeout(() => {
      const region = getShippingRegion(pincode);

      if (!region) {
        setError('Sorry, we do not deliver to this pincode yet.');
        setIsChecking(false);
        return;
      }

      const regionLabel = getShippingRegionLabel(region);
      const baseRate = SHIPPING_CHARGES[region];

      setValidationResult({
        region,
        regionLabel,
        baseRate,
        codAvailable: true,
      });
      setIsChecking(false);
    }, 300);
  };

  const handleConfirm = () => {
    if (!validationResult) return;

    onPincodeValidated(
      pincode,
      validationResult.regionLabel,
      validationResult.baseRate,
      validationResult.codAvailable
    );
    
    onClose();
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    setError('');
    setValidationResult(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pincode.length === 6 && !isChecking) {
      e.preventDefault();
      handleCheck();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />
      
      {/* Dialog Content */}
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Check Delivery Availability
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your pincode to check if we deliver to your area.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="pincode-input">Enter your pincode</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="pincode-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pincode}
                onChange={handlePincodeChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter 6-digit pincode"
                className="flex-1 text-lg tracking-wider"
              />
              <Button
                type="button"
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
          {validationResult && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Great news! We deliver to {pincode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {validationResult.regionLabel} • ₹{validationResult.baseRate}/kg
                    {validationResult.codAvailable && ' • COD Available'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  Confirm & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Cancel button when no result yet */}
          {!validationResult && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PincodeDialog;