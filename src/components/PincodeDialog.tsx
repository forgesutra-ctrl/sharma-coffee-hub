import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, Check, Loader2 } from 'lucide-react';
import {
  validatePincode,
  getShippingRegion,
  getShippingCharge,
  getShippingRegionLabel,
} from '@/lib/shipping';

interface PincodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPincodeValidated: (
    pincode: string,
    shippingCharge: number,
    region: string
  ) => void;
  currentPincode?: string;
}

export function PincodeDialog({
  open,
  onOpenChange,
  onPincodeValidated,
  currentPincode,
}: PincodeDialogProps) {
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{
    charge: number;
    region: string;
  } | null>(null);

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      setPincode(currentPincode || '');
      setError('');
      setIsValidated(false);
      setShippingInfo(null);
      setIsChecking(false);
    }
  }, [open, currentPincode]);

  const handleCheck = () => {
    setError('');
    setIsValidated(false);
    setShippingInfo(null);
    setIsChecking(true);

    // Small delay to show loading state
    setTimeout(() => {
      if (!validatePincode(pincode)) {
        setError('Please enter a valid 6-digit PIN code');
        setIsChecking(false);
        return;
      }

      const region = getShippingRegion(pincode);
      if (!region) {
        setError('Sorry, we do not deliver to this area yet');
        setIsChecking(false);
        return;
      }

      const charge = getShippingCharge(pincode);
      setShippingInfo({
        charge,
        region: getShippingRegionLabel(region),
      });
      setIsValidated(true);
      setIsChecking(false);
    }, 300);
  };

  const handleConfirm = () => {
    if (!shippingInfo) return;

    onPincodeValidated(
      pincode,
      shippingInfo.charge,
      shippingInfo.region
    );

    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    setError('');
    setIsValidated(false);
    setShippingInfo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pincode.length === 6 && !isChecking) {
      e.preventDefault();
      handleCheck();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Check Delivery Availability
          </DialogTitle>
          <DialogDescription>
            Enter your PIN code to check delivery availability and shipping charges
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pincode Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit PIN code"
              value={pincode}
              onChange={handlePincodeChange}
              onKeyDown={handleKeyDown}
              maxLength={6}
              className="flex-1"
              autoFocus={false}
            />
            <Button
              onClick={handleCheck}
              variant="outline"
              disabled={pincode.length !== 6 || isChecking}
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Check'
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Success Message */}
          {isValidated && shippingInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="font-medium">Delivery available!</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Region: {shippingInfo.region}
                </span>
                <span className="font-medium">
                  ₹{shippingInfo.charge} shipping
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!isValidated}
              className="flex-1"
            >
              Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PincodeDialog;