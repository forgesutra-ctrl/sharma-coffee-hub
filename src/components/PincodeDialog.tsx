import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, Check } from 'lucide-react';
import { validatePincode, getShippingRegion, getShippingCharge, getShippingRegionLabel } from '@/lib/shipping';

interface PincodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPincodeValidated: (pincode: string, shippingCharge: number, region: string) => void;
  currentPincode?: string;
}

export function PincodeDialog({ open, onOpenChange, onPincodeValidated, currentPincode }: PincodeDialogProps) {
  const [pincode, setPincode] = useState(currentPincode || '');
  const [error, setError] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{ charge: number; region: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPincode(currentPincode || '');
      setError('');
      setIsValidated(false);
      setShippingInfo(null);
      // Focus input after dialog animation completes
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, currentPincode]);

  const handleCheck = () => {
    setError('');
    setIsValidated(false);
    setShippingInfo(null);

    if (!validatePincode(pincode)) {
      setError('Please enter a valid 6-digit PIN code');
      return;
    }

    const region = getShippingRegion(pincode);
    if (!region) {
      setError('Unable to determine delivery region');
      return;
    }

    const charge = getShippingCharge(pincode);
    setShippingInfo({ charge, region: getShippingRegionLabel(region) });
    setIsValidated(true);
  };

  const handleConfirm = () => {
    if (shippingInfo) {
      onPincodeValidated(pincode, shippingInfo.charge, shippingInfo.region);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus to avoid focus trap issues
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent close auto-focus to avoid focus trap issues
          e.preventDefault();
        }}
      >
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
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit PIN code"
              value={pincode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPincode(value);
                setIsValidated(false);
                setError('');
                setShippingInfo(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pincode.length === 6) {
                  handleCheck();
                }
              }}
              maxLength={6}
              className="flex-1"
            />
            <Button
              onClick={handleCheck}
              variant="outline"
              disabled={pincode.length !== 6}
            >
              Check
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {isValidated && shippingInfo && (
            <div className="bg-muted/30 border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="font-medium">Delivery available!</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Region: {shippingInfo.region}
                </span>
                <span className="font-medium">₹{shippingInfo.charge} shipping</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidated}
              className="flex-1"
            >
              Confirm & Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
