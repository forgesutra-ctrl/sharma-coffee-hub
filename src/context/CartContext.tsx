import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { getShippingCharge, getShippingRegion, getShippingRegionLabel, SHIPPING_CHARGES, COD_ADVANCE_AMOUNT, COD_HANDLING_FEE } from '@/lib/shipping';

interface ShippingInfo {
  pincode: string;
  region: string;
  baseRate: number;
  multiplier: number;
  codAvailable: boolean;
  weight: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, weight: number, is_subscription?: boolean) => void;
  updateQuantity: (productId: string, weight: number, quantity: number, is_subscription?: boolean) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  // Shipping
  shippingInfo: ShippingInfo | null;
  setShippingInfo: React.Dispatch<React.SetStateAction<ShippingInfo | null>>;
  setShippingPincode: (pincode: string) => boolean;
  getShippingCharge: () => number;
  getCartWeight: () => number;
  // COD
  isCodAvailable: () => boolean;
  getCodAdvance: () => number;
  getCodHandlingFee: () => number;
  getCodBalance: (paymentType: 'prepaid' | 'cod') => number;
  getGrandTotal: (paymentType: 'prepaid' | 'cod') => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('sharma-coffee-cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(() => {
    const saved = localStorage.getItem('sharma-coffee-shipping');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('sharma-coffee-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (shippingInfo) {
      localStorage.setItem('sharma-coffee-shipping', JSON.stringify(shippingInfo));
    } else {
      localStorage.removeItem('sharma-coffee-shipping');
    }
  }, [shippingInfo]);

  const getCartWeight = useCallback(() => {
    return cartItems.reduce((totalWeight, item) => {
      return totalWeight + (item.weight * item.quantity);
    }, 0);
  }, [cartItems]);

  const setShippingPincode = useCallback((pincode: string): boolean => {
    const region = getShippingRegion(pincode);
    if (!region) return false;

    const weightInGrams = getCartWeight();
    const weightInKg = weightInGrams / 1000;
    const multiplier = Math.ceil(weightInKg);
    const baseRate = SHIPPING_CHARGES[region];

    setShippingInfo({
      pincode,
      region: getShippingRegionLabel(region),
      baseRate,
      multiplier,
      codAvailable: true,
      weight: weightInGrams,
    });
    return true;
  }, [getCartWeight]);

  const addToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) =>
          item.product.id === newItem.product.id &&
          item.weight === newItem.weight
      );

      if (existingItemIndex > -1) {
        const updated = [...prev];
        updated[existingItemIndex].quantity += newItem.quantity;
        return updated;
      }

      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string, weight: number, is_subscription?: boolean) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.weight === weight &&
            item.is_subscription === (is_subscription || false)
          )
      )
    );
  };

  const updateQuantity = (productId: string, weight: number, quantity: number, is_subscription?: boolean) => {
    if (quantity <= 0) {
      removeFromCart(productId, weight, is_subscription);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        item.weight === weight &&
        item.is_subscription === (is_subscription || false)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setShippingInfo(null);
    localStorage.removeItem('sharma-coffee-shipping');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // Pure getter - just returns the current shipping charge without side effects
  // DOES NOT call setShippingInfo - only calculates and returns
  const getShippingChargeValue = useCallback((): number => {
    if (!shippingInfo || !shippingInfo.baseRate) return 0;

    // Calculate weight from cart items
    const weight = cartItems.reduce((total, item) => {
      return total + (item.weight * item.quantity);
    }, 0);

    if (weight <= 0) return 0;

    // Calculate shipping based on weight: baseRate * ceil(weightInKg)
    // Example: 250g in Karnataka = 50 * ceil(0.25) = 50 * 1 = Rs 50
    // Example: 1500g in South India = 60 * ceil(1.5) = 60 * 2 = Rs 120
    const weightInKg = weight / 1000;
    const multiplier = Math.ceil(weightInKg);
    const charge = shippingInfo.baseRate * multiplier;

    return charge;
  }, [shippingInfo, cartItems]);

  // Check if all items in cart support COD
  const isCodAvailable = useCallback(() => {
    // For now, assume all items support COD unless variant specifies otherwise
    // This can be enhanced when variant cod_enabled field is populated
    return cartItems.length > 0;
  }, [cartItems]);

  const getCodAdvance = () => COD_ADVANCE_AMOUNT;
  const getCodHandlingFee = () => COD_HANDLING_FEE;

  const getCodBalance = (paymentType: 'prepaid' | 'cod') => {
    if (paymentType !== 'cod') return 0;
    const subtotal = getCartTotal();
    const shipping = getShippingChargeValue();
    const total = subtotal + shipping + COD_HANDLING_FEE;
    return total - COD_ADVANCE_AMOUNT;
  };

  const getGrandTotal = (paymentType: 'prepaid' | 'cod') => {
    const subtotal = getCartTotal();
    const shipping = getShippingChargeValue();
    
    if (paymentType === 'cod') {
      return subtotal + shipping + COD_HANDLING_FEE;
    }
    return subtotal + shipping;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        shippingInfo,
        setShippingInfo,
        setShippingPincode,
        getShippingCharge: getShippingChargeValue,
        getCartWeight,
        isCodAvailable,
        getCodAdvance,
        getCodHandlingFee,
        getCodBalance,
        getGrandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
